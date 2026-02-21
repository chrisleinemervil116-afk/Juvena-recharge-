const USERS_KEY = "jr_users";
const SESSION_KEY = "jr_current_user";
const DEFAULT_BALANCE = 50;

function walletKey(email) {
  return `jr_wallet_balance_${email.toLowerCase()}`;
}

function historyKey(email) {
  return `jr_wallet_history_${email.toLowerCase()}`;
}

function topupKey(email) {
  return `jr_topup_requests_${email.toLowerCase()}`;
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function setUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  const email = localStorage.getItem(SESSION_KEY);
  if (!email) return null;
  return getUsers().find((user) => user.email === email) || null;
}

function setCurrentUser(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearCurrentUser() {
  localStorage.removeItem(SESSION_KEY);
}

function getBalance() {
  const user = getCurrentUser();
  if (!user) return 0;
  const key = walletKey(user.email);
  const stored = Number(localStorage.getItem(key));
  if (Number.isFinite(stored) && stored >= 0) return stored;
  localStorage.setItem(key, String(DEFAULT_BALANCE));
  return DEFAULT_BALANCE;
}

function setBalance(value) {
  const user = getCurrentUser();
  if (!user) return;
  localStorage.setItem(walletKey(user.email), String(Math.max(0, value)));
}

function getHistory() {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    return JSON.parse(localStorage.getItem(historyKey(user.email))) || [];
  } catch {
    return [];
  }
}

function addHistory(item) {
  const user = getCurrentUser();
  if (!user) return;
  const history = getHistory();
  history.unshift({ ...item, date: new Date().toISOString() });
  localStorage.setItem(historyKey(user.email), JSON.stringify(history.slice(0, 15)));
}

function getTopupRequests() {
  const user = getCurrentUser();
  if (!user) return [];
  try {
    return JSON.parse(localStorage.getItem(topupKey(user.email))) || [];
  } catch {
    return [];
  }
}

function setTopupRequests(requests) {
  const user = getCurrentUser();
  if (!user) return;
  localStorage.setItem(topupKey(user.email), JSON.stringify(requests));
}

function addTopupRequest(payload) {
  const requests = getTopupRequests();
  requests.unshift({
    ...payload,
    id: `REQ-${Date.now()}`,
    status: "pending",
    date: new Date().toISOString()
  });
  setTopupRequests(requests.slice(0, 20));
}

function formatMoney(amount) {
  return `${amount.toFixed(2)} HTG`;
}

function syncWalletTags() {
  const amount = getBalance();
  document.querySelectorAll("[data-wallet-display]").forEach((el) => {
    el.textContent = formatMoney(amount);
  });
}

function renderHistory(container) {
  if (!container) return;
  const history = getHistory();

  if (!history.length) {
    container.innerHTML = "<li>Aucun mouvement pour le moment.</li>";
    return;
  }

  container.innerHTML = history
    .map((item) => {
      const signClass = item.sign === "+" ? "success" : "danger";
      const when = new Date(item.date).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<li><span>${item.type}<br><small class="small">${when}</small></span><strong class="${signClass}">${item.sign}${formatMoney(item.amount)}</strong></li>`;
    })
    .join("");
}

function renderTopupRequests(container) {
  if (!container) return;
  const pending = getTopupRequests().filter((request) => request.status === "pending");

  if (!pending.length) {
    container.innerHTML = "<li>Aucune demande en attente.</li>";
    return;
  }

  container.innerHTML = pending
    .map((request) => {
      const when = new Date(request.date).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
      return `<li><span><strong>${request.clientName}</strong> • ${request.method}<br><small class="small">Ref: ${request.reference} • ${when}</small></span><button class="btn" data-accept-id="${request.id}" type="button">Accepter</button></li>`;
    })
    .join("");
}

function acceptTopupRequest(requestId) {
  const requests = getTopupRequests();
  const target = requests.find((request) => request.id === requestId && request.status === "pending");
  if (!target) return;

  target.status = "accepted";
  setTopupRequests(requests);

  setBalance(getBalance() + Number(target.amount));
  addHistory({
    type: `Recharge validée (${target.method})`,
    amount: Number(target.amount),
    sign: "+"
  });
}

function setAuthView(isLoggedIn) {
  const authSection = document.getElementById("auth-section");
  const walletContent = document.getElementById("wallet-content");
  const greeting = document.getElementById("client-greeting");
  const user = getCurrentUser();

  if (authSection) authSection.hidden = isLoggedIn;
  if (walletContent) walletContent.hidden = !isLoggedIn;
  if (greeting && user) greeting.textContent = `Bienvenue, ${user.name}`;
}

function initAuth() {
  const signupForm = document.getElementById("signup-form");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const signupMessage = document.getElementById("signup-message");
  const loginMessage = document.getElementById("login-message");

  if (!signupForm && !loginForm && !logoutBtn) return;

  setAuthView(Boolean(getCurrentUser()));

  signupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const password = document.getElementById("signup-password").value;

    if (!name || !email || password.length < 6) {
      signupMessage.textContent = "Informations invalides. Vérifiez vos champs.";
      signupMessage.className = "danger";
      return;
    }

    const users = getUsers();
    if (users.some((user) => user.email === email)) {
      signupMessage.textContent = "Ce compte existe déjà. Connectez-vous.";
      signupMessage.className = "danger";
      return;
    }

    users.push({ name, email, password });
    setUsers(users);
    setCurrentUser(email);
    signupForm.reset();
    signupMessage.textContent = "Inscription réussie. Wallet activé.";
    signupMessage.className = "success";
    setAuthView(true);
    syncWalletTags();
    initWalletPage();
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const user = getUsers().find((item) => item.email === email && item.password === password);

    if (!user) {
      loginMessage.textContent = "Email ou mot de passe incorrect.";
      loginMessage.className = "danger";
      return;
    }

    setCurrentUser(user.email);
    loginForm.reset();
    loginMessage.textContent = "Connexion réussie.";
    loginMessage.className = "success";
    setAuthView(true);
    syncWalletTags();
    initWalletPage();
  });

  logoutBtn?.addEventListener("click", () => {
    clearCurrentUser();
    setAuthView(false);
    syncWalletTags();
  });
}

function initWalletPage() {
  const topupForm = document.getElementById("topup-form");
  const amountInput = document.getElementById("amount");
  const methodInput = document.getElementById("method");
  const referenceInput = document.getElementById("reference");
  const clientNameInput = document.getElementById("client-name");
  const message = document.getElementById("topup-message");
  const historyList = document.getElementById("wallet-history");
  const requestsList = document.getElementById("topup-requests");

  if (!topupForm || !getCurrentUser()) return;

  if (!topupForm.dataset.bound) {
    topupForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const amount = Number(amountInput.value);
      const method = methodInput.value;
      const reference = referenceInput.value.trim();
      const clientName = clientNameInput.value.trim();

      if (!amount || amount <= 0 || !method || !reference || !clientName) {
        message.textContent = "Veuillez remplir toutes les informations de recharge.";
        message.className = "danger";
        return;
      }

      addTopupRequest({ amount, method, reference, clientName });
      topupForm.reset();
      message.textContent = "Demande envoyée. En attente de validation admin.";
      message.className = "success";
      renderTopupRequests(requestsList);
    });

    requestsList?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-accept-id]");
      if (!button) return;

      acceptTopupRequest(button.dataset.acceptId);
      renderTopupRequests(requestsList);
      renderHistory(historyList);
      syncWalletTags();
    });

    topupForm.dataset.bound = "true";
  }

  renderTopupRequests(requestsList);
  renderHistory(historyList);
}

function initOrderCatalog() {
  const categorySelect = document.getElementById("category");
  const productSelect = document.getElementById("product");
  const priceInput = document.getElementById("price");

  if (!categorySelect || !productSelect || !priceInput) return;

  const productOptions = Array.from(productSelect.querySelectorAll("option[data-category]"));

  function refreshProducts() {
    const category = categorySelect.value;
    productOptions.forEach((option) => {
      const match = !category || option.dataset.category === category;
      option.hidden = !match;
    });

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    if (!selectedOption || selectedOption.hidden) {
      productSelect.value = "";
      priceInput.value = "";
    }
  }

  categorySelect.addEventListener("change", refreshProducts);
  productSelect.addEventListener("change", () => {
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    priceInput.value = selectedOption?.dataset?.price || "";
  });

  refreshProducts();
}

function initOrderForm() {
  const orderForm = document.getElementById("order-form");
  const message = document.getElementById("order-message");

  if (!orderForm) return;

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!getCurrentUser()) {
      message.textContent = "Connectez-vous sur la page Wallet avant de passer une commande.";
      message.className = "danger";
      return;
    }

    const formData = new FormData(orderForm);
    const price = Number(formData.get("price"));
    const product = formData.get("product");

    if (!price || !product) {
      message.textContent = "Veuillez choisir un produit valide.";
      message.className = "danger";
      return;
    }

    const balance = getBalance();
    if (balance < price) {
      message.textContent = `Solde insuffisant. Votre wallet contient ${formatMoney(balance)}.`;
      message.className = "danger";
      return;
    }

    setBalance(balance - price);
    addHistory({
      type: `Commande: ${product}`,
      amount: price,
      sign: "-"
    });
    syncWalletTags();

    message.textContent = `Commande confirmée pour ${product}. Paiement effectué avec le wallet.`;
    message.className = "success";
    orderForm.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  syncWalletTags();
  initWalletPage();
  initOrderCatalog();
  initOrderForm();
});
