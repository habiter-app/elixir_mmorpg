defmodule ElixirMmorpg.Repo do
  use Ecto.Repo,
    otp_app: :elixir_mmorpg,
    adapter: Ecto.Adapters.Postgres
end
