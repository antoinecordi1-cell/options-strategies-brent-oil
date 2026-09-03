"""
payoffs.py
----------
Fonctions de payoff élémentaires pour options vanilles, basées sur
Hull, "Options, Futures, and Other Derivatives", Chapitre 11.

Convention :
- S : array de prix du sous-jacent à l'échéance
- K : strike
- premium : prime payée (position longue) ou reçue (position courte)
- Position "long"  -> on paie la prime, payoff = max(...) - premium
- Position "short" -> on reçoit la prime, payoff = -max(...) + premium
"""

import numpy as np


def call_payoff(S, K, premium, position="long"):
    """Payoff net d'un call vanille à l'échéance."""
    intrinsic = np.maximum(S - K, 0.0)
    if position == "long":
        return intrinsic - premium
    elif position == "short":
        return -intrinsic + premium
    raise ValueError("position doit être 'long' ou 'short'")


def put_payoff(S, K, premium, position="long"):
    """Payoff net d'un put vanille à l'échéance."""
    intrinsic = np.maximum(K - S, 0.0)
    if position == "long":
        return intrinsic - premium
    elif position == "short":
        return -intrinsic + premium
    raise ValueError("position doit être 'long' ou 'short'")


def underlying_payoff(S, S0, qty=1, position="long"):
    """Payoff d'une position sur le sous-jacent lui-même (utile pour le collar)."""
    pnl = qty * (S - S0)
    return pnl if position == "long" else -pnl


def breakeven_points(S, pnl, tol=1e-9):
    """
    Détecte les points de breakeven (changements de signe) par interpolation
    linéaire entre deux points consécutifs de la grille S/pnl.
    """
    S = np.asarray(S)
    pnl = np.asarray(pnl)
    crossings = []
    for i in range(len(pnl) - 1):
        y0, y1 = pnl[i], pnl[i + 1]
        if abs(y0) < tol:
            crossings.append(S[i])
        elif y0 * y1 < 0:
            x0, x1 = S[i], S[i + 1]
            x_cross = x0 - y0 * (x1 - x0) / (y1 - y0)
            crossings.append(x_cross)
    return sorted(set(round(c, 2) for c in crossings))


def max_gain_loss(pnl):
    """
    Retourne (gain_max, perte_max) sur la grille fournie.
    Note : sur une grille finie, un payoff 'illimité' apparaîtra plafonné
    aux bornes de la grille -> à interpréter avec le contexte théorique.
    """
    return float(np.max(pnl)), float(np.min(pnl))
