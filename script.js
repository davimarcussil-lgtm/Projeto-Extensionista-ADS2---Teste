/* =====================================================
   UniCarona CCI - Home Page
   Sem banco de dados: os dados ficam em memória e
   são reiniciados ao recarregar a página.
   ===================================================== */

const USUARIO = { nome: "Você", iniciais: "VC" };
const ECONOMIA_POR_VAGA = 15; // estimativa em R$ por passageiro

// Data de hoje no formato YYYY-MM-DD (para os exemplos)
function dataOffset(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// ---------- Dados de exemplo ----------
let posts = [
  {
    id: 1, tipo: "oferta", autor: "Mariana Souza", papel: "Aluna • ADS",
    origem: "Taguatinga", destino: "Faculdade CCI",
    data: dataOffset(1), horario: "18:30", vagas: 3, ocupadas: 1,
    obs: "Saio pontualmente. Divido o combustível!",
    curtidas: 4, curtido: false, solicitado: false, minha: false,
    comentarios: [{ autor: "Pedro Lima", texto: "Tem vaga pro retorno também?" }],
    mostrarComentarios: false
  },
  {
    id: 2, tipo: "pedido", autor: "Lucas Andrade", papel: "Aluno • Direito",
    origem: "Ceilândia", destino: "Faculdade CCI",
    data: dataOffset(1), horario: "19:00", vagas: 1, ocupadas: 0,
    obs: "Alguém passando perto do Metrô Ceilândia Centro?",
    curtidas: 2, curtido: false, solicitado: false, minha: false,
    comentarios: [], mostrarComentarios: false
  },
  {
    id: 3, tipo: "oferta", autor: "Prof. Roberto Alves", papel: "Professor",
    origem: "Asa Sul", destino: "Faculdade CCI",
    data: dataOffset(2), horario: "17:45", vagas: 2, ocupadas: 0,
    obs: "Carro pequeno, só 2 vagas. Retorno depois das aulas.",
    curtidas: 9, curtido: false, solicitado: false, minha: false,
    comentarios: [
      { autor: "Ana Clara", texto: "Que ótima iniciativa, professor!" },
      { autor: "Prof. Roberto Alves", texto: "Vamos dividir os trajetos 😊" }
    ],
    mostrarComentarios: false
  },
  {
    id: 4, tipo: "oferta", autor: "Camila Rocha", papel: "Aluna • Sistemas de Informação",
    origem: "Samambaia", destino: "Faculdade CCI",
    data: dataOffset(3), horario: "18:00", vagas: 4, ocupadas: 4,
    obs: "Vagas esgotadas, mas posso abrir lista de espera!",
    curtidas: 6, curtido: false, solicitado: false, minha: false,
    comentarios: [], mostrarComentarios: false
  }
];

let proximoId = 5;
let filtroAtual = "todas";
let termoBusca = "";
let notificacoes = [];
let solicitadasPorMim = 0;

// ---------- Atalhos ----------
const $ = (id) => document.getElementById(id);
const listaPosts = $("listaPosts");

function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function iniciais(nome) {
  return nome.split(" ").filter(p => !/^(Prof\.|Profa\.)$/.test(p))
    .slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function formatarData(iso) {
  const hoje = dataOffset(0), amanha = dataOffset(1);
  if (iso === hoje) return "Hoje";
  if (iso === amanha) return "Amanhã";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("oculto");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add("oculto"), 2500);
}

// ---------- Renderização do feed ----------
function postsFiltrados() {
  return posts.filter(p => {
    if (filtroAtual === "oferta" && p.tipo !== "oferta") return false;
    if (filtroAtual === "pedido" && p.tipo !== "pedido") return false;
    if (filtroAtual === "minhas" && !p.minha) return false;
    if (termoBusca) {
      const alvo = `${p.origem} ${p.destino} ${p.autor}`.toLowerCase();
      if (!alvo.includes(termoBusca)) return false;
    }
    return true;
  });
}

function renderPost(p) {
  const vagasLivres = p.vagas - p.ocupadas;
  const lotado = p.tipo === "oferta" && vagasLivres <= 0;

  let infoVagas = "";
  if (p.tipo === "oferta") {
    infoVagas = lotado
      ? `<p class="vagas-info lotado">🚫 Sem vagas disponíveis</p>`
      : `<p class="vagas-info">💺 ${vagasLivres} de ${p.vagas} vagas disponíveis</p>`;
  } else {
    infoVagas = `<p class="vagas-info">👥 Precisa de ${p.vagas} vaga(s)</p>`;
  }

  let botaoPrincipal = "";
  if (p.minha) {
    botaoPrincipal = `<button class="acao" data-acao="excluir" data-id="${p.id}">🗑️ Excluir</button>`;
  } else if (p.tipo === "oferta") {
    botaoPrincipal = p.solicitado
      ? `<button class="acao solicitado" data-acao="solicitar" data-id="${p.id}">✅ Vaga solicitada</button>`
      : `<button class="acao" data-acao="solicitar" data-id="${p.id}" ${lotado ? "disabled" : ""}>🙋 Solicitar vaga</button>`;
  } else {
    botaoPrincipal = p.solicitado
      ? `<button class="acao solicitado" data-acao="solicitar" data-id="${p.id}">✅ Oferta enviada</button>`
      : `<button class="acao" data-acao="solicitar" data-id="${p.id}">🚘 Oferecer carona</button>`;
  }

  const comentariosHtml = p.mostrarComentarios ? `
    <div class="comentarios">
      ${p.comentarios.map(c => `
        <div class="comentario">
          <div class="avatar">${iniciais(c.autor)}</div>
          <div class="comentario-balao"><strong>${escapar(c.autor)}</strong>${escapar(c.texto)}</div>
        </div>`).join("")}
      <div class="novo-comentario">
        <input type="text" placeholder="Escreva um comentário..." id="inputCom${p.id}">
        <button data-acao="enviarCom" data-id="${p.id}">Enviar</button>
      </div>
    </div>` : "";

  return `
    <article class="card post" id="post${p.id}">
      <div class="post-topo">
        <div class="avatar">${iniciais(p.autor)}</div>
        <div class="info">
          <strong>${escapar(p.autor)}</strong>
          <span>${escapar(p.papel)}</span>
        </div>
        <span class="tag ${p.tipo === "oferta" ? "tag-oferta" : "tag-pedido"}">
          ${p.tipo === "oferta" ? "Oferece carona" : "Pede carona"}
        </span>
      </div>

      <div class="rota">
        <div class="rota-linha"><span class="ponto ponto-origem"></span> ${escapar(p.origem)}</div>
        <div class="rota-linha"><span class="ponto ponto-destino"></span> ${escapar(p.destino)}</div>
        <div class="rota-detalhes">
          <span>📅 ${formatarData(p.data)}</span>
          <span>🕒 ${p.horario}</span>
        </div>
      </div>

      ${p.obs ? `<p class="obs-post">${escapar(p.obs)}</p>` : ""}
      ${infoVagas}

      <div class="post-acoes">
        <button class="acao ${p.curtido ? "curtido" : ""}" data-acao="curtir" data-id="${p.id}">
          ${p.curtido ? "❤️" : "🤍"} ${p.curtidas}
        </button>
        <button class="acao" data-acao="comentar" data-id="${p.id}">💬 ${p.comentarios.length}</button>
        ${botaoPrincipal}
      </div>
      ${comentariosHtml}
    </article>`;
}

function renderFeed() {
  const lista = postsFiltrados();
  listaPosts.innerHTML = lista.map(renderPost).join("");
  $("msgVazio").classList.toggle("oculto", lista.length > 0);
  atualizarLateral();
}

// ---------- Barra lateral e estatísticas ----------
function atualizarLateral() {
  const oferecidas = posts.filter(p => p.minha && p.tipo === "oferta").length;
  $("statOferecidas").textContent = oferecidas;
  $("statSolicitadas").textContent = solicitadasPorMim;

  // Destinos/origens em alta
  const contagem = {};
  posts.forEach(p => {
    contagem[p.origem] = (contagem[p.origem] || 0) + 1;
  });
  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
  $("destinosAlta").innerHTML = top.map(([local, n]) =>
    `<li data-local="${escapar(local)}">📍 ${escapar(local)} <span>${n} carona(s)</span></li>`).join("");

  // Impacto
  const ocupadas = posts.reduce((soma, p) => soma + (p.tipo === "oferta" ? p.ocupadas : 0), 0);
  $("impCarros").textContent = ocupadas;
  $("impEconomia").textContent = "R$ " + ocupadas * ECONOMIA_POR_VAGA;
}

// ---------- Notificações ----------
function notificar(texto) {
  notificacoes.unshift(texto);
  atualizarNotificacoes();
}

function atualizarNotificacoes() {
  const badge = $("badgeNotif");
  badge.textContent = notificacoes.length;
  badge.classList.toggle("zero", notificacoes.length === 0);
  $("listaNotif").innerHTML = notificacoes.length
    ? notificacoes.map(n => `<li>${escapar(n)}</li>`).join("")
    : `<li class="vazia">Nenhuma notificação por enquanto.</li>`;
}

// ---------- Ações nos posts (delegação de eventos) ----------
listaPosts.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-acao]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const post = posts.find(p => p.id === id);
  if (!post) return;

  switch (btn.dataset.acao) {
    case "curtir":
      post.curtido = !post.curtido;
      post.curtidas += post.curtido ? 1 : -1;
      renderFeed();
      break;

    case "comentar":
      post.mostrarComentarios = !post.mostrarComentarios;
      renderFeed();
      if (post.mostrarComentarios) {
        const campo = $("inputCom" + id);
        if (campo) campo.focus();
      }
      break;

    case "enviarCom": {
      const campo = $("inputCom" + id);
      const texto = campo.value.trim();
      if (!texto) return;
      post.comentarios.push({ autor: USUARIO.nome, texto });
      renderFeed();
      $("inputCom" + id).focus();
      break;
    }

    case "solicitar":
      if (post.solicitado) {
        // Cancelar solicitação
        post.solicitado = false;
        if (post.tipo === "oferta") post.ocupadas--;
        solicitadasPorMim--;
        toast("Solicitação cancelada.");
      } else {
        post.solicitado = true;
        if (post.tipo === "oferta") post.ocupadas++;
        solicitadasPorMim++;
        if (post.tipo === "oferta") {
          toast(`Vaga solicitada com ${post.autor}!`);
          notificar(`Você solicitou uma vaga na carona de ${post.autor} (${post.origem} → ${post.destino}).`);
        } else {
          toast(`Oferta enviada para ${post.autor}!`);
          notificar(`Você ofereceu carona para ${post.autor} (${post.origem} → ${post.destino}).`);
        }
      }
      renderFeed();
      break;

    case "excluir":
      if (confirm("Deseja excluir esta publicação?")) {
        posts = posts.filter(p => p.id !== id);
        toast("Publicação excluída.");
        renderFeed();
      }
      break;
  }
});

// Enter nos campos de comentário
listaPosts.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id && e.target.id.startsWith("inputCom")) {
    const id = e.target.id.replace("inputCom", "");
    const btn = listaPosts.querySelector(`[data-acao="enviarCom"][data-id="${id}"]`);
    if (btn) btn.click();
  }
});

// ---------- Formulário de nova carona ----------
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
}

$("abrirForm").addEventListener("click", abrirForm);
$("cancelarForm").addEventListener("click", fecharForm);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const tipo = form.querySelector("input[name=tipo]:checked").value;
  const vagas = parseInt($("vagas").value, 10);

  posts.unshift({
    id: proximoId++, tipo,
    autor: USUARIO.nome, papel: "Aluno(a) • Faculdade CCI",
    origem: $("origem").value.trim(),
    destino: $("destino").value.trim(),
    data: $("data").value, horario: $("horario").value,
    vagas: vagas, ocupadas: 0,
    obs: $("obs").value.trim(),
    curtidas: 0, curtido: false, solicitado: false, minha: true,
    comentarios: [], mostrarComentarios: false
  });

  fecharForm();
  filtroAtual = "todas";
  sincronizarFiltros();
  renderFeed();
  toast(tipo === "oferta" ? "Carona publicada! 🚗" : "Pedido de carona publicado! 🙋");
  notificar(tipo === "oferta" ? "Sua carona foi publicada no feed." : "Seu pedido de carona foi publicado no feed.");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- Filtros (chips e menu lateral) ----------
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

// ---------- Busca ----------
$("campoBusca").addEventListener("input", (e) => {
  termoBusca = e.target.value.trim().toLowerCase();
  renderFeed();
});

// Clicar em um local em alta preenche a busca
$("destinosAlta").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  $("campoBusca").value = li.dataset.local;
  termoBusca = li.dataset.local.toLowerCase();
  renderFeed();
});

// ---------- Painel de notificações ----------
$("btnNotificacoes").addEventListener("click", () => $("painelNotif").classList.toggle("oculto"));
$("fecharNotif").addEventListener("click", () => $("painelNotif").classList.add("oculto"));

// ---------- Início ----------
$("avatarTopo").textContent = USUARIO.iniciais;
notificar("Bem-vindo(a) ao UniCarona CCI! Publique ou procure uma carona.");
renderFeed();
