# Juvena Recharge

Site web vitrine multi-pages pour recharge gaming, digitale et financière avec wallet intégré.

## Wallet HTG: recharge manuelle
- Le client envoie une demande de recharge via **NatCash** ou **MonCash**.
- L'admin valide la demande avec le bouton **Accepter** pour créditer le wallet.
- Coordonnées de recharge:
  - NatCash: `42219380` — Nom: `mervil juvens`
  - MonCash: `34186164` — Nom: `juvens mervil`

## Pages
- `index.html` : Accueil + aperçu du wallet
- `gaming.html` : Offres gaming (FREE FIRE, DLS 26, eFootball, Flex City) avec packs Free Fire: 100+10 (160 HTG), 200+20 (330 HTG), 310+31 (485 HTG), 420+31 (700 HTG), 1060+1600 (1600 HTG) et packs DLS 26: 900 (400 HTG), 1950 (825 HTG), 3450 (1400 HTG), 6700 (2375 HTG), 14500 (4000 HTG), 40500 (9250 HTG)
- `digital.html` : Collection digitale (Netflix, Disney+, Prime Video) avec durées 1 mois (500 HTG), 2 mois (1000 HTG), 3 mois (1950 HTG)
- `financial.html` : Produits financiers (Compte PayPal 500 HTG, Compte Wise 1000 HTG, Gift Card)
- `wallet.html` : Demandes de recharge HTG + validation admin + historique
- `order.html` : Formulaire de commande avec paiement wallet

## Lancer en local
```bash
python3 -m http.server 8000
```
Puis ouvrir `http://localhost:8000`.

Dernière mise à jour: tarifs HTG synchronisés sur les pages Produits et Commande.
