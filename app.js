const WALLET_KEY = "jr_wallet_balance";
const HISTORY_KEY = "jr_wallet_history";
const TOPUP_REQUESTS_KEY = "jr_topup_requests";
const DEFAULT_BALANCE = 50;

function getBalance() {
  const stored = Number(localStorage.getItem(WALLET_KEY));
  if (Number.isFinite(stored) && stored >= 0) return stored;
  localStorage.setItem(WALLET_KEY, String(DEFAULT_BALANCE));
  return DEFAULT_BALANCE;
}

function setBalance(value) {
  localStorage.setItem(WALLET_KEY, String(Math.max(0, value)));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function addHistory(item) {
  const history = getHistory();
  history.unshift({ ...item, date: new Date().toISOString() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 15)));
}

function getTopupRequests() {
  try {
    return JSON.parse(localStorage.getItem(TOPUP_REQUESTS_KEY)) || [];
  } catch {
    return [];
  }
}

function setTopupRequests(requests) {
  localStorage.setItem(TOPUP_REQUESTS_KEY, JSON.stringify(requests));
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

function initWalletPage() {
  const topupForm = document.getElementById("topup-form");
  const amountInput = document.getElementById("amount");
  const methodInput = document.getElementById("method");
  const referenceInput = document.getElementById("reference");
  const clientNameInput = document.getElementById("client-name");
  const message = document.getElementById("topup-message");
  const historyList = document.getElementById("wallet-history");
  const requestsList = document.getElementById("topup-requests");

  if (!topupForm) return;

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
  syncWalletTags();
  initWalletPage();
  initOrderCatalog();
  initOrderForm();
});
