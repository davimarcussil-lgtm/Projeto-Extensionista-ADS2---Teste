/* =====================================================
   UniCarona CCI
   Sem banco de dados: tudo fica salvo no navegador
   (localStorage). Para recomeçar, limpe os dados do site.
   ===================================================== */

const CHAVE = "unicarona_v2";
const ECONOMIA_POR_VAGA = 15; // estimativa em R$ por passageiro

const $ = (id) => document.getElementById(id);
const listaPosts = $("listaPosts");

// ---------- Datas ----------
function isoLocal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function dataOffset(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return isoLocal(d);
}
function formatarData(iso) {
  if (iso === dataOffset(0)) return "Hoje";
  if (iso === dataOffset(1)) return "Amanhã";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}
function encerrada(p) {
  return new Date(`${p.data}T${p.horario}`) < new Date();
}
function tempoRelativo(ts) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} d`;
}

// ---------- Estado ----------
function dadosIniciais() {
  const h = 3600000, agora = Date.now();
  const base = { curtidas: 0, curtido: false, solicitado: false, salvo: false, minha: false, valor: 0, comentarios: [], mostrarComentarios: false };
  return {
    perfil: { nome: "Você", curso: "Aluno(a) • Faculdade CCI" },
    tema: "claro",
    seq: 5,
    notifs: [{ t: "Bem-vindo(a) ao UniCarona CCI! Publique ou procure uma carona.", nova: true }],
    posts: [
      { ...base, id: 1, tipo: "oferta", autor: "Mariana Souza", papel: "Aluna • ADS", origem: "Taguatinga", destino: "Faculdade CCI",
        data: dataOffset(1), horario: "18:30", vagas: 3, ocupadas: 1, valor: 8, obs: "Saio pontualmente. Divido o combustível!",
        curtidas: 4, criado: agora - 1 * h, comentarios: [{ autor: "Pedro Lima", texto: "Tem vaga pro retorno também?" }] },
      { ...base, id: 2, tipo: "pedido", autor: "Lucas Andrade", papel: "Aluno • Direito", origem: "Ceilândia", destino: "Faculdade CCI",
        data: dataOffset(1), horario: "19:00", vagas: 1, ocupadas: 0, obs: "Alguém passando perto do Metrô Ceilândia Centro?",
        curtidas: 2, criado: agora - 3 * h },
      { ...base, id: 3, tipo: "oferta", autor: "Prof. Roberto Alves", papel: "Professor", origem: "Asa Sul", destino: "Faculdade CCI",
        data: dataOffset(2), horario: "17:45", vagas: 2, ocupadas: 0, obs: "Carro pequeno, só 2 vagas. Retorno depois das aulas.",
        curtidas: 9, criado: agora - 6 * h,
        comentarios: [{ autor: "Ana Clara", texto: "Que ótima iniciativa, professor!" }, { autor: "Prof. Roberto Alves", texto: "Vamos dividir os trajetos 😊" }] },
      { ...base, id: 4, tipo: "oferta", autor: "Camila Rocha", papel: "Aluna • Sistemas de Informação", origem: "Samambaia", destino: "Faculdade CCI",
        data: dataOffset(3), horario: "18:00", vagas: 4, ocupadas: 4, valor: 10, obs: "Vagas esgotadas, mas posso abrir lista de espera!",
        curtidas: 6, criado: agora - 20 * h }
    ]
  };
}

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo && salvo.posts) return salvo;
  } catch (e) { /* sem storage: segue com dados iniciais */ }
  return dadosIniciais();
}
function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* ignora */ }
}

let estado = carregar();
let filtroAtual = "todas";
let termoBusca = "";
let ordem = "recentes";

// ---------- Utilitários ----------
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
function iniciais(nome) {
  return nome.split(" ").filter(p => p && !/^(Prof\.|Profa\.)$/.test(p))
    .slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
}
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("oculto");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("oculto"), 2600);
}
function notificar(texto) {
  estado.notifs.unshift({ t: texto, nova: true });
  estado.notifs = estado.notifs.slice(0, 30);
  salvar();
  renderNotificacoes();
}
const nomeDe = (p) => (p.minha ? estado.perfil.nome : p.autor);
const papelDe = (p) => (p.minha ? estado.perfil.curso : p.papel);

// ---------- Feed ----------
function postsFiltrados() {
  const lista = estado.posts.filter(p => {
    if (filtroAtual === "oferta" && p.tipo !== "oferta") return false;
    if (filtroAtual === "pedido" && p.tipo !== "pedido") return false;
    if (filtroAtual === "minhas" && !p.minha) return false;
    if (filtroAtual === "solicitadas" && !p.solicitado) return false;
    if (filtroAtual === "salvas" && !p.salvo) return false;
    if (termoBusca) {
      const alvo = `${p.origem} ${p.destino} ${nomeDe(p)} ${p.obs}`.toLowerCase();
      if (!alvo.includes(termoBusca)) return false;
    }
    return true;
  });
  const data = (p) => new Date(`${p.data}T${p.horario}`).getTime();
  if (ordem === "recentes") lista.sort((a, b) => b.criado - a.criado);
  if (ordem === "proximas") lista.sort((a, b) => (encerrada(a) - encerrada(b)) || data(a) - data(b));
  if (ordem === "populares") lista.sort((a, b) => b.curtidas - a.curtidas);
  return lista;
}

function renderPost(p) {
  const fim = encerrada(p);
  const livres = p.vagas - p.ocupadas;
  const lotado = p.tipo === "oferta" && livres <= 0;

  let vagasHtml;
  if (p.tipo === "oferta") {
    const pct = Math.round((p.ocupadas / p.vagas) * 100);
    vagasHtml = `<p class="vagas-info ${lotado ? "lotado" : ""}">${lotado ? "🚫 Sem vagas disponíveis" : `💺 ${livres} de ${p.vagas} vagas disponíveis`}</p>
      <div class="barra-vagas" aria-hidden="true"><i style="width:${pct}%"></i></div>`;
  } else {
    vagasHtml = `<p class="vagas-info">👥 Precisa de ${p.vagas} vaga(s)</p>`;
  }

  let principal;
  if (p.minha) {
    principal = `<button class="acao" data-acao="excluir" data-id="${p.id}">🗑️ Excluir</button>`;
  } else if (p.solicitado) {
    principal = `<button class="acao principal solicitado" data-acao="solicitar" data-id="${p.id}">✅ ${p.tipo === "oferta" ? "Vaga solicitada" : "Oferta enviada"} · cancelar</button>`;
  } else {
    const txt = p.tipo === "oferta" ? "🙋 Solicitar vaga" : "🚘 Oferecer carona";
    principal = `<button class="acao principal" data-acao="solicitar" data-id="${p.id}" ${lotado || fim ? "disabled" : ""}>${txt}</button>`;
  }

  const comentarios = p.mostrarComentarios ? `
    <div class="comentarios">
      ${p.comentarios.map(c => `
        <div class="comentario">
          <div class="avatar">${iniciais(c.eu ? estado.perfil.nome : c.autor)}</div>
          <div class="comentario-balao"><strong>${escapar(c.eu ? estado.perfil.nome : c.autor)}</strong>${escapar(c.texto)}</div>
        </div>`).join("")}
      <div class="novo-comentario">
        <input type="text" placeholder="Escreva um comentário…" id="inputCom${p.id}" maxlength="200">
        <button data-acao="enviarCom" data-id="${p.id}">Enviar</button>
      </div>
    </div>` : "";

  return `
    <article class="card post ${fim ? "encerrada" : ""}" id="post${p.id}">
      <div class="post-topo">
        <div class="avatar">${iniciais(nomeDe(p))}</div>
        <div class="info">
          <strong>${escapar(nomeDe(p))}</strong>
          <span>${escapar(papelDe(p))} • ${tempoRelativo(p.criado)}</span>
        </div>
        ${fim ? `<span class="tag tag-fim">Encerrada</span>` :
          `<span class="tag ${p.tipo === "oferta" ? "tag-oferta" : "tag-pedido"}">${p.tipo === "oferta" ? "Oferece carona" : "Pede carona"}</span>`}
      </div>
      <div class="rota">
        <div class="rota-linha"><span class="ponto ponto-origem"></span>${escapar(p.origem)}</div>
        <div class="rota-linha"><span class="ponto ponto-destino"></span>${escapar(p.destino)}</div>
        <div class="rota-detalhes">
          <span>📅 ${formatarData(p.data)}</span>
          <span>🕒 ${p.horario}</span>
          <span>💰 ${p.valor > 0 ? "R$ " + p.valor + " por pessoa" : "Sem custo"}</span>
        </div>
      </div>
      ${p.obs ? `<p class="obs-post">${escapar(p.obs)}</p>` : ""}
      ${vagasHtml}
      <div class="post-acoes">
        <button class="acao ${p.curtido ? "curtido" : ""}" data-acao="curtir" data-id="${p.id}" aria-label="Curtir">${p.curtido ? "❤️" : "🤍"} ${p.curtidas}</button>
        <button class="acao" data-acao="comentar" data-id="${p.id}" aria-label="Comentários">💬 ${p.comentarios.length}</button>
        <button class="acao ${p.salvo ? "salvo" : ""}" data-acao="salvar" data-id="${p.id}" aria-label="Salvar">${p.salvo ? "🔖" : "📑"}</button>
        <button class="acao" data-acao="compartilhar" data-id="${p.id}" aria-label="Compartilhar">🔗</button>
        ${principal}
      </div>
      ${comentarios}
    </article>`;
}

const TEXTOS_VAZIO = {
  todas: "Nenhuma carona por aqui ainda. Seja o primeiro a publicar!",
  oferta: "Ninguém ofereceu carona ainda.",
  pedido: "Ninguém pediu carona ainda.",
  minhas: "Você ainda não publicou nada.",
  solicitadas: "Você ainda não solicitou nenhuma vaga. Explore o início e escolha uma carona.",
  salvas: "Nada salvo. Toque em 📑 num post para guardar."
};

function renderFeed() {
  const lista = postsFiltrados();
  listaPosts.innerHTML = lista.map(renderPost).join("");
  const vazio = lista.length === 0;
  $("msgVazio").classList.toggle("oculto", !vazio);
  $("textoVazio").textContent = termoBusca ? "Nada encontrado para essa busca." : TEXTOS_VAZIO[filtroAtual];
  atualizarLateral();
}

// ---------- Lateral, perfil e impacto ----------
function atualizarLateral() {
  const ps = estado.posts;
  $("statOferecidas").textContent = ps.filter(p => p.minha).length;
  $("statSolicitadas").textContent = ps.filter(p => p.solicitado).length;
  $("statSalvas").textContent = ps.filter(p => p.salvo).length;

  const cont = {};
  ps.filter(p => !encerrada(p)).forEach(p => { cont[p.origem] = (cont[p.origem] || 0) + 1; });
  const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("destinosAlta").innerHTML = top.length
    ? top.map(([l, n]) => `<li data-local="${escapar(l)}">📍 ${escapar(l)} <span>${n} carona(s)</span></li>`).join("")
    : `<li class="muted">Sem trajetos ativos.</li>`;

  const ocupadas = ps.reduce((s, p) => s + (p.tipo === "oferta" ? p.ocupadas : 0), 0);
  $("impCarros").textContent = ocupadas;
  $("impEconomia").textContent = "R$ " + ocupadas * ECONOMIA_POR_VAGA;
}

function renderPerfil() {
  const { nome, curso } = estado.perfil;
  const ini = iniciais(nome);
  $("nomePerfil").textContent = nome;
  $("cursoPerfil").textContent = curso;
  ["avatarTopo", "avatarPerfil", "avatarComposer"].forEach(id => { $(id).textContent = ini; });
}

function aplicarTema() {
  document.documentElement.dataset.tema = estado.tema;
  $("btnTema").textContent = estado.tema === "escuro" ? "☀️" : "🌙";
}

// ---------- Notificações ----------
function renderNotificacoes() {
  const novas = estado.notifs.filter(n => n.nova).length;
  const badge = $("badgeNotif");
  badge.textContent = novas;
  badge.classList.toggle("zero", novas === 0);
  $("listaNotif").innerHTML = estado.notifs.length
    ? estado.notifs.map(n => `<li class="${n.nova ? "nova" : ""}">${escapar(n.t)}</li>`).join("")
    : `<li class="vazia">Nenhuma notificação por enquanto.</li>`;
}

$("btnNotificacoes").addEventListener("click", () => {
  const painel = $("painelNotif");
  painel.classList.toggle("oculto");
  renderNotificacoes(); // mostra destaque das novas
  if (!painel.classList.contains("oculto")) {
    estado.notifs.forEach(n => { n.nova = false; });
    salvar();
    $("badgeNotif").classList.add("zero");
  }
});
$("fecharNotif").addEventListener("click", () => $("painelNotif").classList.add("oculto"));
$("limparNotif").addEventListener("click", () => { estado.notifs = []; salvar(); renderNotificacoes(); });

// ---------- Ações nos posts ----------
listaPosts.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-acao]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const post = estado.posts.find(p => p.id === id);
  if (!post) return;

  switch (btn.dataset.acao) {
    case "curtir":
      post.curtido = !post.curtido;
      post.curtidas += post.curtido ? 1 : -1;
      break;

    case "comentar":
      post.mostrarComentarios = !post.mostrarComentarios;
      salvar(); renderFeed();
      if (post.mostrarComentarios) { const c = $("inputCom" + id); if (c) c.focus(); }
      return;

    case "enviarCom": {
      const campo = $("inputCom" + id);
      const texto = campo.value.trim();
      if (!texto) return;
      post.comentarios.push({ autor: estado.perfil.nome, texto, eu: true });
      salvar(); renderFeed();
      $("inputCom" + id).focus();
      return;
    }

    case "salvar":
      post.salvo = !post.salvo;
      toast(post.salvo ? "Carona salva 🔖" : "Removida das salvas");
      break;

    case "compartilhar": {
      const texto = `${post.tipo === "oferta" ? "Carona" : "Pedido de carona"}: ${post.origem} → ${post.destino}, ${formatarData(post.data)} às ${post.horario} (UniCarona CCI)`;
      const ok = () => toast("Resumo copiado para compartilhar!");
      if (navigator.clipboard) navigator.clipboard.writeText(texto).then(ok, () => toast(texto));
      else toast(texto);
      return;
    }

    case "solicitar":
      if (post.solicitado) {
        post.solicitado = false;
        if (post.tipo === "oferta") post.ocupadas--;
        toast("Solicitação cancelada.");
      } else {
        post.solicitado = true;
        if (post.tipo === "oferta") post.ocupadas++;
        const rota = `${post.origem} → ${post.destino}`;
        if (post.tipo === "oferta") {
          toast(`Vaga solicitada com ${post.autor}!`);
          notificar(`Você solicitou uma vaga na carona de ${post.autor} (${rota}).`);
          setTimeout(() => notificar(`${post.autor} viu seu pedido de vaga (${rota}). Combine o ponto de encontro nos comentários.`), 5000);
        } else {
          toast(`Oferta enviada para ${post.autor}!`);
          notificar(`Você ofereceu carona para ${post.autor} (${rota}).`);
        }
      }
      break;

    case "excluir":
      if (!confirm("Deseja excluir esta publicação?")) return;
      estado.posts = estado.posts.filter(p => p.id !== id);
      toast("Publicação excluída.");
      break;
  }
  salvar();
  renderFeed();
});

listaPosts.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id && e.target.id.startsWith("inputCom")) {
    const btn = listaPosts.querySelector(`[data-acao="enviarCom"][data-id="${e.target.id.replace("inputCom", "")}"]`);
    if (btn) btn.click();
  }
});

// ---------- Formulário ----------
const form = $("formCarona");

function abrirForm() {
  form.classList.remove("oculto");
  $("data").value = dataOffset(0);
  $("data").min = dataOffset(0);
  $("origem").focus();
}
function fecharForm() {
  form.classList.add("oculto");
  form.reset();
  $("contador").textContent = "0";
  $("rotuloVagas").textContent = "Vagas";
}

$("abrirForm").addEventListener("click", abrirForm);
$("vazioPublicar").addEventListener("click", () => { abrirForm(); window.scrollTo({ top: 0, behavior: "smooth" }); });
$("cancelarForm").addEventListener("click", fecharForm);
$("obs").addEventListener("input", (e) => { $("contador").textContent = e.target.value.length; });
form.querySelectorAll("input[name=tipo]").forEach(r => r.addEventListener("change", () => {
  $("rotuloVagas").textContent = r.value === "oferta" ? "Vagas" : "Vagas necessárias";
}));

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const tipo = form.querySelector("input[name=tipo]:checked").value;
  const data = $("data").value, horario = $("horario").value;
  if (new Date(`${data}T${horario}`) < new Date()) {
    toast("Escolha um horário que ainda não passou.");
    return;
  }
  estado.posts.unshift({
    id: estado.seq++, tipo,
    autor: estado.perfil.nome, papel: estado.perfil.curso,
    origem: $("origem").value.trim(), destino: $("destino").value.trim(),
    data, horario,
    vagas: parseInt($("vagas").value, 10) || 1, ocupadas: 0,
    valor: tipo === "oferta" ? Math.max(0, parseInt($("valor").value, 10) || 0) : 0,
    obs: $("obs").value.trim(),
    curtidas: 0, curtido: false, solicitado: false, salvo: false, minha: true,
    comentarios: [], mostrarComentarios: false, criado: Date.now()
  });
  fecharForm();
  filtroAtual = "todas"; ordem = "recentes"; termoBusca = ""; $("campoBusca").value = ""; $("ordem").value = "recentes";
  sincronizarFiltros();
  salvar(); renderFeed();
  toast(tipo === "oferta" ? "Carona publicada! 🚗" : "Pedido publicado! 🙋");
  notificar(tipo === "oferta" ? "Sua carona foi publicada no feed." : "Seu pedido de carona foi publicado no feed.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- Filtros, ordem e busca ----------
function sincronizarFiltros() {
  document.querySelectorAll(".chip, .menu-item").forEach(el => {
    el.classList.toggle("ativo", el.dataset.filtro === filtroAtual);
  });
}
document.querySelectorAll(".chip, .menu-item").forEach(el => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    filtroAtual = el.dataset.filtro;
    sincronizarFiltros();
    renderFeed();
  });
});
$("ordem").addEventListener("change", (e) => { ordem = e.target.value; renderFeed(); });
$("campoBusca").addEventListener("input", (e) => { termoBusca = e.target.value.trim().toLowerCase(); renderFeed(); });
$("destinosAlta").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-local]");
  if (!li) return;
  $("campoBusca").value = li.dataset.local;
  termoBusca = li.dataset.local.toLowerCase();
  renderFeed();
});

// ---------- Perfil e tema ----------
function abrirPerfil() {
  $("perfNome").value = estado.perfil.nome;
  $("perfCurso").value = estado.perfil.curso;
  $("modalPerfil").classList.remove("oculto");
  $("perfNome").focus();
}
function fecharPerfil() { $("modalPerfil").classList.add("oculto"); }
["avatarTopo", "editarPerfil"].forEach(id => $(id).addEventListener("click", abrirPerfil));
$("fecharPerfil").addEventListener("click", fecharPerfil);
$("modalPerfil").addEventListener("click", (e) => { if (e.target.id === "modalPerfil") fecharPerfil(); });
$("formPerfil").addEventListener("submit", (e) => {
  e.preventDefault();
  estado.perfil.nome = $("perfNome").value.trim() || "Você";
  estado.perfil.curso = $("perfCurso").value.trim() || "Aluno(a) • Faculdade CCI";
  salvar(); renderPerfil(); renderFeed(); fecharPerfil();
  toast("Perfil atualizado.");
});
$("btnTema").addEventListener("click", () => {
  estado.tema = estado.tema === "escuro" ? "claro" : "escuro";
  salvar(); aplicarTema();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { fecharPerfil(); $("painelNotif").classList.add("oculto"); }
});

// ---------- Início ----------
aplicarTema();
renderPerfil();
renderNotificacoes();
renderFeed();
