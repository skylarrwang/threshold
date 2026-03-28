#!/usr/bin/env python3
"""Threshold — Re-entry AI Agent CLI."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

load_dotenv()

app = typer.Typer(help="Threshold — AI assistant for re-entry after incarceration")
console = Console()

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))


def _ensure_data_dirs():
    for sub in ["profile", "memory", "tracking", "documents", "resources"]:
        (DATA_DIR / sub).mkdir(parents=True, exist_ok=True)


@app.command()
def seed():
    """Create a test profile for demo purposes (skips the interview)."""
    from cryptography.fernet import Fernet

    if not os.getenv("THRESHOLD_ENCRYPTION_KEY"):
        key = Fernet.generate_key().decode()
        env_path = Path(".env")
        lines = []
        if env_path.exists():
            lines = env_path.read_text().splitlines()

        updated = False
        for i, line in enumerate(lines):
            if line.startswith("THRESHOLD_ENCRYPTION_KEY"):
                lines[i] = f"THRESHOLD_ENCRYPTION_KEY={key}"
                updated = True
                break
        if not updated:
            lines.append(f"THRESHOLD_ENCRYPTION_KEY={key}")

        env_path.write_text("\n".join(lines) + "\n")
        os.environ["THRESHOLD_ENCRYPTION_KEY"] = key
        console.print(f"[dim]Generated encryption key and saved to .env[/dim]")

    _ensure_data_dirs()

    from threshold.memory.profile import UserProfile, save_profile

    profile = UserProfile(
        personal={
            "name": "Marcus Chen",
            "age_range": "30-35",
            "home_state": "CT",
            "release_date": "2026-02-15",
            "time_served": "3 years",
            "offense_category": "non-violent",
            "comfort_with_technology": "moderate",
        },
        situation={
            "housing_status": "shelter",
            "employment_status": "unemployed",
            "benefits_enrolled": [],
            "supervision_type": "parole",
            "supervision_end_date": "2028-02-15",
            "immediate_needs": ["housing", "employment", "ID restoration"],
        },
        goals={
            "short_term_goals": ["Find stable housing", "Get a job", "Restore ID documents"],
            "long_term_goals": ["Career in construction", "Own apartment", "Reconnect with family"],
            "values": ["independence", "stability", "family"],
            "strengths": ["Carpentry skills", "Reliability", "GED completed", "Forklift certification"],
            "concerns": ["Background check barriers", "Finding affordable housing in Hartford"],
        },
        support={
            "has_case_worker": True,
            "case_worker_name": "Diana",
            "support_contacts": ["Diana (case worker)", "Mom"],
            "trusted_people": ["Mom", "Brother"],
        },
        preferences={
            "communication_style": "direct",
            "check_in_frequency": "weekly",
            "wants_reminders": True,
            "privacy_level": "high",
        },
    )

    save_profile(profile)
    console.print(Panel(
        "[bold green]Test profile created for Tyler Chen.[/bold green]\n\n"
        "30-35 y/o, released 2026-02-15 from CT (Hartford area).\n"
        "Currently in a shelter, on parole, looking for work and housing.\n"
        "Strengths: carpentry, forklift cert, GED.\n\n"
        "Run [bold]python main.py chat[/bold] to start talking to Threshold.",
        title="Seed Profile",
    ))


@app.command()
def profile():
    """Display the current user profile."""
    _ensure_encryption_key()
    from threshold.memory.profile import load_profile

    p = load_profile()
    if p is None:
        console.print("[yellow]No profile found. Run 'python main.py seed' to create a test profile.[/yellow]")
        raise typer.Exit(1)

    table = Table(title="User Profile", show_header=True)
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="white")

    table.add_row("Name", p.personal.name or "—")
    table.add_row("State", p.personal.home_state)
    table.add_row("Release Date", p.personal.release_date)
    table.add_row("Offense Category", p.personal.offense_category)
    table.add_row("Housing", p.situation.housing_status)
    table.add_row("Employment", p.situation.employment_status)
    table.add_row("Supervision", f"{p.situation.supervision_type} (until {p.situation.supervision_end_date or '—'})")
    table.add_row("Immediate Needs", ", ".join(p.situation.immediate_needs) or "—")
    table.add_row("Short-term Goals", ", ".join(p.goals.short_term_goals) or "—")
    table.add_row("Strengths", ", ".join(p.goals.strengths) or "—")
    table.add_row("Case Worker", p.support.case_worker_name or ("Yes" if p.support.has_case_worker else "No"))
    table.add_row("Communication Style", p.preferences.communication_style)

    console.print(table)


@app.command()
def chat():
    """Start the Threshold chat loop (default command)."""
    _ensure_encryption_key()
    _ensure_data_dirs()

    from threshold.memory.profile import profile_exists

    if not profile_exists():
        console.print(Panel(
            "[yellow]No profile found.[/yellow]\n\n"
            "Run [bold]python main.py seed[/bold] to create a test profile for demo,\n"
            "or the interview agent will be available in a future update.",
            title="First Run",
        ))
        raise typer.Exit(1)

    console.print(Panel(
        "[bold]Welcome to Threshold[/bold]\n\n"
        "Type your message and press Enter.\n"
        "Special commands: [bold]help[/bold], [bold]profile[/bold], [bold]reflect[/bold], [bold]quit[/bold]",
        title="Threshold",
        border_style="blue",
    ))

    from threshold.agents.orchestrator import create_orchestrator
    from threshold.memory import get_checkpointer

    checkpointer = get_checkpointer()
    agent = create_orchestrator(checkpointer=checkpointer)
    config = {"configurable": {"thread_id": "threshold-main"}}

    while True:
        try:
            user_input = console.input("[bold blue]You:[/bold blue] ").strip()
        except (EOFError, KeyboardInterrupt):
            console.print("\n[dim]Goodbye.[/dim]")
            break

        if not user_input:
            continue

        if user_input.lower() == "quit":
            console.print("[dim]Goodbye.[/dim]")
            break

        if user_input.lower() == "help":
            _show_help()
            continue

        if user_input.lower() == "profile":
            profile()
            continue

        if user_input.lower() == "reflect":
            _run_reflect()
            continue

        try:
            result = agent.invoke(
                {"messages": [{"role": "user", "content": user_input}]},
                config=config,
            )
            messages = result.get("messages", [])
            if messages:
                last = messages[-1]
                content = last.content if hasattr(last, "content") else str(last)
                console.print(f"\n[bold green]Threshold:[/bold green] {content}\n")
            else:
                console.print("[dim]No response.[/dim]")
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


def _show_help():
    help_text = (
        "[bold]Available commands:[/bold]\n\n"
        "  [cyan]help[/cyan]     — Show this help message\n"
        "  [cyan]profile[/cyan]  — Display your current profile\n"
        "  [cyan]reflect[/cyan]  — Run the reflection engine\n"
        "  [cyan]quit[/cyan]     — Exit Threshold\n\n"
        "[bold]What I can help with:[/bold]\n\n"
        "  [green]Employment[/green] — Job search, cover letters, resumes, ban-the-box info\n"
        "  [green]Housing[/green]    — Housing search, applications, tenant rights, shelters\n"
        "  [green]Benefits[/green]   — SNAP, Medicaid, SSI eligibility checks\n"
        "  [green]Supervision[/green] — Track conditions, check-ins, upcoming requirements\n"
        "  [green]Documents[/green]  — ID restoration guides, expungement eligibility\n"
        "  [green]Support[/green]    — Community resources, emotional support, crisis help\n"
    )
    console.print(Panel(help_text, title="Help", border_style="blue"))


def _run_reflect():
    from threshold.memory.observation_stream import get_recent_observations
    from threshold.memory.profile import load_profile
    from threshold.memory.reflection import save_reflections, synthesize_reflections

    p = load_profile()
    if p is None:
        console.print("[yellow]No profile to reflect on.[/yellow]")
        return

    obs = get_recent_observations(n=20)
    if not obs:
        console.print("[yellow]No recent observations to reflect on.[/yellow]")
        return

    console.print("[dim]Synthesizing reflections...[/dim]")
    reflections = synthesize_reflections(p, obs)
    save_reflections(reflections)

    console.print(Panel(
        "\n".join(f"• {r}" for r in reflections),
        title="Reflections",
        border_style="green",
    ))


@app.command()
def serve(
    port: int = typer.Option(8000, help="Port to run the API server on"),
    reload: bool = typer.Option(False, help="Enable auto-reload for development"),
):
    """Start the Threshold API server (FastAPI + WebSocket)."""
    _ensure_data_dirs()
    import uvicorn
    console.print(Panel(
        f"[bold]Starting Threshold API server[/bold]\n\n"
        f"  REST:      http://localhost:{port}/api\n"
        f"  WebSocket: ws://localhost:{port}/ws\n"
        f"  Docs:      http://localhost:{port}/docs\n\n"
        "The frontend (Vite dev server) proxies to this automatically.",
        title="Threshold Server",
        border_style="blue",
    ))
    uvicorn.run(
        "threshold.server:app",
        host="127.0.0.1",
        port=port,
        reload=reload,
    )


def _ensure_encryption_key():
    if not os.getenv("THRESHOLD_ENCRYPTION_KEY"):
        console.print(
            "[red]THRESHOLD_ENCRYPTION_KEY is not set.[/red]\n"
            "Run [bold]python main.py seed[/bold] to auto-generate one,\n"
            "or set it in .env manually."
        )
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
