const URL = "https://cfnhqqpkahpwllraimsm.supabase.co/rest/v1";
const KEY = "sb_publishable_tISpiWV7BVvVD3wKuiGWkw_DL2Nw23Q";
const headers = { apikey: KEY, "Content-Type": "application/json" };
export const normalize = (s) => s.normalize("NFKC").trim().toLowerCase();
export class Save {
  constructor(onstatus) {
    this.status = onstatus;
    this.revision = 0;
    this.cloud = false;
    this.conflict = false;
    this.chain = Promise.resolve();
  }
  async open(name) {
    this.name = name;
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem("rpg:" + name));
    } catch {}
    try {
      let res = await fetch(
        `${URL}/rpg_characters?name=eq.${encodeURIComponent(name)}&select=state,revision`,
        { headers, signal: AbortSignal.timeout(6000) },
      );
      if (!res.ok) throw Error();
      let [row] = await res.json();
      this.cloud = true;
      this.revision = row?.revision || 0;
      this.status("Nuvem conectada");
      return row?.state || local;
    } catch {
      this.status("Somente neste aparelho · nuvem indisponível");
      return local;
    }
  }
  save(state) {
    let copy = JSON.parse(JSON.stringify(state));
    try {
      localStorage.setItem("rpg:" + this.name, JSON.stringify(copy));
    } catch {
      this.status("Não foi possível salvar neste aparelho");
    }
    if (!this.cloud || this.conflict) return this.chain;
    this.chain = this.chain.then(async () => {
      if (this.conflict) return;
      try {
        let res = await fetch(`${URL}/rpc/rpg_save`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_name: this.name,
            p_state: copy,
            p_revision: this.revision,
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (res.status === 409) {
          this.conflict = true;
          this.status(
            "Conflito: personagem aberto em outro lugar. Recarregue para continuar.",
          );
          return;
        }
        if (!res.ok) throw Error();
        this.revision = await res.json();
        this.status("Progresso salvo na nuvem");
      } catch {
        this.status("Salvo neste aparelho · falha ao sincronizar");
      }
    });
    return this.chain;
  }
}
