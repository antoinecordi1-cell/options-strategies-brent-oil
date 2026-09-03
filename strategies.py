"""
strategies.py
-------------
Construction de 6 stratégies optionnelles classiques (Hull, ch.11)
appliquées au Brent Crude Oil, dans le contexte de tension géopolitique
Moyen-Orient de fin août / début septembre 2026 (spot ~ 90 $/baril).

Les primes sont des approximations réalistes (pas de pricing Black-Scholes,
volontairement hors périmètre du chapitre 11) cohérentes avec un marché
en forte volatilité implicite.
"""

import numpy as np
from payoffs import call_payoff, put_payoff, underlying_payoff, breakeven_points, max_gain_loss

S0 = 90.0  # spot Brent, $/baril
S = np.linspace(50, 140, 900)  # grille de prix à l'échéance

# Primes approximées (cohérentes avec IV élevée post-choc géopolitique)
PREMIUMS = {
    "call_90": 4.20,
    "call_100": 1.60,
    "put_90": 4.00,
    "put_80": 1.30,
    "put_95": 5.90,
    "call_85": 7.80,
    "call_95": 2.60,
    "put_85": 2.10,
    "call_80": 11.60,
}


def long_straddle(Sx=None):
    """Pari sur un choc fort (dans un sens ou l'autre) : escalade ou désescalade brutale."""
    Sx = S if Sx is None else Sx
    c = call_payoff(Sx, 90, PREMIUMS["call_90"], "long")
    p = put_payoff(Sx, 90, PREMIUMS["put_90"], "long")
    return c + p


def long_strangle(Sx=None):
    """Même vue que le straddle, coût d'entrée réduit, zone morte plus large."""
    Sx = S if Sx is None else Sx
    c = call_payoff(Sx, 95, PREMIUMS["call_95"], "long")
    p = put_payoff(Sx, 85, PREMIUMS["put_85"], "long")
    return c + p


def bull_call_spread(Sx=None):
    """Pari haussier modéré : poursuite des tensions, hausse contenue par la demande."""
    Sx = S if Sx is None else Sx
    c_long = call_payoff(Sx, 90, PREMIUMS["call_90"], "long")
    c_short = call_payoff(Sx, 100, PREMIUMS["call_100"], "short")
    return c_long + c_short


def bear_put_spread(Sx=None):
    """Pari baissier modéré : désescalade / accord diplomatique partiel."""
    Sx = S if Sx is None else Sx
    p_long = put_payoff(Sx, 90, PREMIUMS["put_90"], "long")
    p_short = put_payoff(Sx, 80, PREMIUMS["put_80"], "short")
    return p_long + p_short


def long_butterfly(Sx=None):
    """Pari sur une stabilisation autour de 90$ (statu quo géopolitique)."""
    Sx = S if Sx is None else Sx
    c1 = call_payoff(Sx, 80, PREMIUMS["call_80"], "long")
    c2 = call_payoff(Sx, 90, PREMIUMS["call_90"], "short")
    c3 = call_payoff(Sx, 90, PREMIUMS["call_90"], "short")
    c4 = call_payoff(Sx, 100, PREMIUMS["call_100"], "long")
    return c1 + c2 + c3 + c4


def collar(Sx=None):
    """
    Couverture typique d'un producteur/trader détenant du brut :
    long sous-jacent + long put (plancher) + short call (financement du put).
    """
    Sx = S if Sx is None else Sx
    under = underlying_payoff(Sx, S0, qty=1, position="long")
    p_long = put_payoff(Sx, 85, PREMIUMS["put_85"], "long")
    c_short = call_payoff(Sx, 95, PREMIUMS["call_95"], "short")
    return under + p_long + c_short


STRATEGIES = {
    "Long Straddle": {
        "func": long_straddle,
        "view": "Forte volatilité attendue (sens indéterminé)",
        "strikes": "K = 90",
        "net_premium": 8.20,  # débit
        "unlimited_upside": True,
    },
    "Long Strangle": {
        "func": long_strangle,
        "view": "Forte volatilité attendue, budget de prime réduit",
        "strikes": "K = 85 / 95",
        "net_premium": 4.70,
        "unlimited_upside": True,
    },
    "Bull Call Spread": {
        "func": bull_call_spread,
        "view": "Hausse modérée (poursuite des tensions)",
        "strikes": "K = 90 / 100",
        "net_premium": 2.60,
        "unlimited_upside": False,
    },
    "Bear Put Spread": {
        "func": bear_put_spread,
        "view": "Baisse modérée (désescalade)",
        "strikes": "K = 90 / 80",
        "net_premium": 2.70,
        "unlimited_upside": False,
    },
    "Long Butterfly": {
        "func": long_butterfly,
        "view": "Stabilisation attendue autour de 90$",
        "strikes": "K = 80 / 90 / 100",
        "net_premium": 4.80,
        "unlimited_upside": False,
    },
    "Collar (couverture)": {
        "func": collar,
        "view": "Détention physique + protection du risque de baisse",
        "strikes": "Put K=85 / Call K=95",
        "net_premium": -0.50,  # crédit net (quasi zero-cost collar)
        "unlimited_upside": False,
    },
}


def build_summary():
    """Construit le tableau de synthèse (breakeven, gain max, perte max, prime nette, ratio R/R)."""
    rows = []
    for name, info in STRATEGIES.items():
        pnl = info["func"]()
        be = breakeven_points(S, pnl)
        gmax, gmin = max_gain_loss(pnl)
        be_pct = ", ".join(f"{((b - S0) / S0) * 100:+.1f}%" for b in be) if be else "—"
        if info["unlimited_upside"]:
            rr = "Illimité (call long)"
        else:
            rr = f"{gmax / abs(gmin):.2f}" if gmin != 0 else "N/A"
        prime_label = f"{info['net_premium']:.2f}$ (débit)" if info["net_premium"] >= 0 else f"{abs(info['net_premium']):.2f}$ (crédit)"
        rows.append({
            "Stratégie": name,
            "Vue de marché": info["view"],
            "Strikes": info["strikes"],
            "Prime nette": prime_label,
            "Breakeven(s)": ", ".join(f"{b:.1f}$" for b in be) if be else "—",
            "Breakeven (% vs spot)": be_pct,
            "Gain max": f"{gmax:.2f}$",
            "Perte max": f"{gmin:.2f}$",
            "Ratio R/R": rr,
        })
    return rows


SCENARIO_PRICES = [70, 80, 85, 90, 95, 100, 110, 120]


def build_scenarios():
    """P&L de chaque stratégie pour une série de prix du Brent à l'échéance."""
    table = []
    for name, info in STRATEGIES.items():
        pnl = info["func"](np.array(SCENARIO_PRICES, dtype=float))
        table.append({"Stratégie": name, "pnl": [round(float(x), 2) for x in pnl]})
    return table


if __name__ == "__main__":
    for row in build_summary():
        print(row)
