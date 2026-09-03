"""
plots.py
--------
Génère :
- un graphique payoff individuel par stratégie (charts/<nom>.png)
- une planche comparative 2x3 (charts/comparatif.png) pour le post LinkedIn
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import os

from strategies import STRATEGIES, S, S0, build_summary
from payoffs import breakeven_points

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "charts")
os.makedirs(OUT_DIR, exist_ok=True)

COLOR_GAIN = "#1f7a4d"
COLOR_LOSS = "#b3261e"
COLOR_LINE = "#1a1a1a"
COLOR_SPOT = "#555555"


def _style_ax(ax, title):
    ax.axhline(0, color="#999999", linewidth=0.8)
    ax.axvline(S0, color=COLOR_SPOT, linewidth=0.8, linestyle="--", alpha=0.7)
    ax.set_title(title, fontsize=11, fontweight="bold")
    ax.set_xlabel("Prix du Brent à l'échéance ($/baril)", fontsize=9)
    ax.set_ylabel("P&L ($/baril)", fontsize=9)
    ax.grid(alpha=0.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)


def _plot_single(ax, name, info):
    pnl = info["func"]()
    ax.fill_between(S, pnl, 0, where=(pnl >= 0), color=COLOR_GAIN, alpha=0.25, interpolate=True)
    ax.fill_between(S, pnl, 0, where=(pnl < 0), color=COLOR_LOSS, alpha=0.25, interpolate=True)
    ax.plot(S, pnl, color=COLOR_LINE, linewidth=1.8)

    be = breakeven_points(S, pnl)
    for b in be:
        ax.plot(b, 0, "o", color=COLOR_LINE, markersize=4)
        ax.annotate(f"{b:.1f}$", (b, 0), textcoords="offset points",
                    xytext=(0, 8), ha="center", fontsize=7.5)

    _style_ax(ax, f"{name}\n({info['strikes']})")


def make_individual_charts():
    for name, info in STRATEGIES.items():
        fig, ax = plt.subplots(figsize=(6.5, 4.2))
        _plot_single(ax, name, info)
        fig.tight_layout()
        fname = name.lower().replace(" ", "_").replace("(", "").replace(")", "")
        path = os.path.join(OUT_DIR, f"{fname}.png")
        fig.savefig(path, dpi=160)
        plt.close(fig)
        print("saved", path)


def make_comparative_grid():
    fig, axes = plt.subplots(2, 3, figsize=(16, 9))
    fig.suptitle(
        "Stratégies optionnelles sur le Brent (spot ≈ 90$) — contexte de tension géopolitique Moyen-Orient, sept. 2026",
        fontsize=13, fontweight="bold", y=1.02
    )
    for ax, (name, info) in zip(axes.flat, STRATEGIES.items()):
        _plot_single(ax, name, info)
    fig.tight_layout()
    path = os.path.join(OUT_DIR, "comparatif.png")
    fig.savefig(path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    print("saved", path)


if __name__ == "__main__":
    make_individual_charts()
    make_comparative_grid()
    print()
    for row in build_summary():
        print(row)
