document.addEventListener("DOMContentLoaded", () => {
  // Elementos DOM
  const formEquipo = document.getElementById("formEquipo");
  const tablaEquipos = document.querySelector("#tablaEquipos tbody");
  const formMantenimiento = document.getElementById("formMantenimiento");
  const tablaMantenimientos = document.querySelector(
    "#tablaMantenimientos tbody"
  );
  const equipoSelect = document.getElementById("equipoSelect");
  const buscador = document.getElementById("buscador");

  const btnEquipos = document.getElementById("btnEquipos");
  const btnMantenimientos = document.getElementById("btnMantenimientos");
  const equiposSection = document.getElementById("equiposSection");
  const mantenimientosSection = document.getElementById(
    "mantenimientosSection"
  );

  const cardOk = document.getElementById("cardOk");
  const cardProximo = document.getElementById("cardProximo");
  const cardVencido = document.getElementById("cardVencido");

  // Canvas firmas
  const canvasTecnico = document.getElementById("firmaTecnico");
  const canvasEmpleado = document.getElementById("firmaEmpleado");
  const ctxTecnico = canvasTecnico.getContext("2d");
  const ctxEmpleado = canvasEmpleado.getContext("2d");

  let equipos = JSON.parse(localStorage.getItem("equipos")) || [];
  window.mantenimientos =
    JSON.parse(localStorage.getItem("mantenimientos")) || [];

  const guardarDatos = () => {
    localStorage.setItem("equipos", JSON.stringify(equipos));
    localStorage.setItem("mantenimientos", JSON.stringify(mantenimientos));
  };

  const calcularProximo = (fecha) => {
    const f = new Date(fecha);
    f.setMonth(f.getMonth() + 6);
    return f.toISOString().split("T")[0];
  };

  const estadoMantenimiento = (proximo) => {
    const hoy = new Date();
    const fecha = new Date(proximo);
    const diff = (fecha - hoy) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { texto: "Vencido", clase: "estado-vencido" };
    if (diff <= 30) return { texto: "Próximo", clase: "estado-proximo" };
    return { texto: "OK", clase: "estado-ok" };
  };

  const actualizarResumen = () => {
    let ok = 0,
      prox = 0,
      venc = 0;
    equipos.forEach((eq) => {
      const e = estadoMantenimiento(eq.proximoMantenimiento);
      if (e.texto === "OK") ok++;
      else if (e.texto === "Próximo") prox++;
      else venc++;
    });
    cardOk.textContent = `OK: ${ok}`;
    cardProximo.textContent = `Próximos: ${prox}`;
    cardVencido.textContent = `Vencidos: ${venc}`;
  };

  const renderEquipos = (filtro = "") => {
    tablaEquipos.innerHTML = "";
    equipoSelect.innerHTML = '<option value="">Seleccione un equipo</option>';

    equipos
      .filter(
        (eq) =>
          eq.nombre.toLowerCase().includes(filtro) ||
          eq.numeroSerie.toLowerCase().includes(filtro) ||
          estadoMantenimiento(eq.proximoMantenimiento)
            .texto.toLowerCase()
            .includes(filtro)
      )
      .forEach((eq, i) => {
        const estado = estadoMantenimiento(eq.proximoMantenimiento);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${eq.nombre}</td>
          <td>${eq.numeroSerie}</td>
          <td>${eq.proximoMantenimiento}</td>
          <td class="${estado.clase}">${estado.texto}</td>
          <td><button onclick="eliminarEquipo(${i})">🗑️</button></td>
        `;
        tablaEquipos.appendChild(tr);
        equipoSelect.innerHTML += `<option value="${eq.numeroSerie}">${eq.nombre}</option>`;
      });
    actualizarResumen();
  };

  const renderMantenimientos = (filtroTexto = "", filtroDepto = "") => {
    tablaMantenimientos.innerHTML = "";

    // Filtrar mantenimientos según texto y departamento
    const mantenimientosFiltrados = mantenimientos.filter((m) => {
      const texto = filtroTexto.toLowerCase();
      const coincideTexto =
        m.nombreEquipo.toLowerCase().includes(texto) ||
        m.nombreEmpleado.toLowerCase().includes(texto) ||
        m.numeroSerie.toLowerCase().includes(texto);
      const coincideDepto = !filtroDepto || m.departamento === filtroDepto;
      return coincideTexto && coincideDepto;
    });

    mantenimientosFiltrados.forEach((m) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${m.nombreEquipo}</td>
            <td>${m.nombreEmpleado}</td>
            <td>${m.departamento}</td>
            <td>${m.puesto}</td>
            <td>${m.fecha}</td>
            <td>${[...m.tareasPreventivas, ...m.tareasCorrectivas].join(
              ", "
            )}</td>
            <td>
                ${
                  m.firmaTecnico
                    ? `<img src="${m.firmaTecnico}" class="thumb">`
                    : ""
                }
                ${
                  m.firmaEmpleado
                    ? `<img src="${m.firmaEmpleado}" class="thumb">`
                    : ""
                }
            </td>
            <td><button class="btnPDF">PDF</button></td>
        `;
      tablaMantenimientos.appendChild(tr);

      tr.querySelector(".btnPDF").addEventListener("click", () =>
        generarPDF(m)
      );
    });

    // Rellenar dinámicamente el filtro de departamentos
    const filtroDeptoSelect = document.getElementById("filtroDepartamento");
    const departamentos = [
      ...new Set(mantenimientos.map((m) => m.departamento)),
    ];
    filtroDeptoSelect.innerHTML = `<option value="">Todos los departamentos</option>`;
    departamentos.forEach((dep) => {
      const option = document.createElement("option");
      option.value = dep;
      option.textContent = dep;
      filtroDeptoSelect.appendChild(option);
    });
  };

  // Filtros y buscador de mantenimientos
  const buscadorMantenimientos = document.getElementById(
    "buscadorMantenimientos"
  );
  const filtroDepartamento = document.getElementById("filtroDepartamento");

  buscadorMantenimientos.addEventListener("input", () => {
    renderMantenimientos(
      buscadorMantenimientos.value.toLowerCase(),
      filtroDepartamento.value
    );
  });

  filtroDepartamento.addEventListener("change", () => {
    renderMantenimientos(
      buscadorMantenimientos.value.toLowerCase(),
      filtroDepartamento.value
    );
  });

  // Canvas firma
  const dibujarFirma = (canvas, ctx) => {
    let dibujando = false;

    canvas.addEventListener("mousedown", (e) => (dibujando = true));
    canvas.addEventListener("mouseup", (e) => (dibujando = false));
    canvas.addEventListener("mouseleave", (e) => (dibujando = false));

    canvas.addEventListener("mousemove", (e) => {
      if (!dibujando) return;
      const rect = canvas.getBoundingClientRect();
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Táctil
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      dibujando = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!dibujando) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    });
    canvas.addEventListener("touchend", (e) => {
      dibujando = false;
      ctx.beginPath();
    });
  };

  dibujarFirma(canvasTecnico, ctxTecnico);
  dibujarFirma(canvasEmpleado, ctxEmpleado);

  // ===== MODAL FIRMA =====
  const modalFirma = document.getElementById("modalFirma");
  const canvasFull = document.getElementById("canvasFirmaFull");
  const ctxFull = canvasFull.getContext("2d");

  let canvasDestino = null;

  // Ajustar tamaño al abrir
  function resizeCanvasFull() {
    canvasFull.width = window.innerWidth;
    canvasFull.height = window.innerHeight - 120;
  }

  // Abrir modal
  document.querySelectorAll(".btnFirma").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      canvasDestino = document.getElementById(targetId);

      resizeCanvasFull();
      ctxFull.clearRect(0, 0, canvasFull.width, canvasFull.height);
      modalFirma.classList.remove("oculto");
    });
  });

  // Dibujar firma en full screen
  dibujarFirma(canvasFull, ctxFull);

  // Guardar firma en canvas original
  document.getElementById("guardarFirmaFull").addEventListener("click", () => {
    const ctxDestino = canvasDestino.getContext("2d");
    ctxDestino.clearRect(0, 0, canvasDestino.width, canvasDestino.height);

    ctxDestino.drawImage(
      canvasFull,
      0,
      0,
      canvasDestino.width,
      canvasDestino.height
    );

    modalFirma.classList.add("oculto");
  });

  // Limpiar
  document.getElementById("limpiarFirmaFull").addEventListener("click", () => {
    ctxFull.clearRect(0, 0, canvasFull.width, canvasFull.height);
  });

  // Cerrar sin guardar
  document.getElementById("cerrarFirmaFull").addEventListener("click", () => {
    modalFirma.classList.add("oculto");
  });

  // Eventos
  formEquipo.addEventListener("submit", (e) => {
    e.preventDefault();
    const nuevo = {
      nombre: formEquipo.nombre.value,
      numeroSerie: formEquipo.numeroSerie.value,
      ubicacion: formEquipo.ubicacion.value,
      responsable: formEquipo.responsable.value,
      fechaUltMantenimiento: new Date().toISOString().split("T")[0],
      proximoMantenimiento: calcularProximo(new Date()),
    };
    equipos.push(nuevo);
    guardarDatos();
    renderEquipos();
    formEquipo.reset();
  });

  window.eliminarEquipo = (i) => {
    if (confirm("¿Eliminar este equipo?")) {
      equipos.splice(i, 1);
      guardarDatos();
      renderEquipos();
    }
  };

  formMantenimiento.addEventListener("submit", (e) => {
    e.preventDefault();
    const serie = equipoSelect.value;
    const eq = equipos.find((e) => e.numeroSerie === serie);
    if (!eq) return alert("Selecciona un equipo válido");

    // Obtener tareas seleccionadas
    const tareasPreventivas = Array.from(
      formMantenimiento.querySelectorAll('input[name="tareas"]:checked')
    ).map((cb) => cb.value);
    const tareasCorrectivas = Array.from(
      formMantenimiento.querySelectorAll(
        'input[name="tareasCorrectivas"]:checked'
      )
    ).map((cb) => cb.value);

    // Guardar firmas como base64
    const firmaTecnico = canvasTecnico.toDataURL();
    const firmaEmpleado = canvasEmpleado.toDataURL();
    (async () => {
      const fotoAntes = await obtenerImagenBase64(fotoAntesInput);
      const fotoDespues = await obtenerImagenBase64(fotoDespuesInput);

      const nuevo = {
        nombreEquipo: eq.nombre,
        numeroSerie: serie,
        nombreEmpleado: formMantenimiento.nombreEmpleado.value,
        departamento: formMantenimiento.departamento.value,
        puesto: formMantenimiento.puesto.value,
        fecha: formMantenimiento.fechaMantenimiento.value,
        tareasPreventivas,
        tareasCorrectivas,
        firmaTecnico,
        firmaEmpleado,
        fotoAntes,
        fotoDespues,
      };

      // Actualizar próximo mantenimiento
      eq.fechaUltMantenimiento = nuevo.fecha;
      eq.proximoMantenimiento = calcularProximo(nuevo.fecha);

      mantenimientos.push(nuevo);
      guardarDatos();
      renderEquipos();
      renderMantenimientos();
      formMantenimiento.reset();
      ctxTecnico.clearRect(0, 0, canvasTecnico.width, canvasTecnico.height);
      ctxEmpleado.clearRect(0, 0, canvasEmpleado.width, canvasEmpleado.height);
      alert("Mantenimiento registrado con éxito");
    })();
  });

  buscador.addEventListener("input", (e) =>
    renderEquipos(e.target.value.toLowerCase())
  );

  // Navegación
  btnEquipos.addEventListener("click", () => {
    equiposSection.classList.remove("oculto");
    mantenimientosSection.classList.add("oculto");
    btnEquipos.classList.add("activo");
    btnMantenimientos.classList.remove("activo");
  });
  btnMantenimientos.addEventListener("click", () => {
    equiposSection.classList.add("oculto");
    mantenimientosSection.classList.remove("oculto");
    btnEquipos.classList.remove("activo");
    btnMantenimientos.classList.add("activo");
  });

  // Inicial
  renderEquipos();
  renderMantenimientos();
});

const fotoAntesInput = document.getElementById("fotoAntes");
const fotoDespuesInput = document.getElementById("fotoDespues");

function obtenerImagenBase64(fileInput) {
  return new Promise((resolve) => {
    const file = fileInput.files[0];
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// generar PDF

async function generarPDF(m) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  // === CARGAR PLANTILLA ===
  const plantilla = new Image();
  plantilla.src = "assets/mtto.jpg";

  await new Promise((resolve) => (plantilla.onload = resolve));

  // Fondo
  doc.addImage(plantilla, "PNG", 0, 0, 210, 297);

  doc.setFontSize(9);

  /* =========================
       DATOS GENERALES
    ========================= */
  doc.text(m.nombreEmpleado, 40, 55);
  doc.text(m.departamento, 100, 55);

  doc.text(m.puesto, 160, 55);
  doc.text(m.fecha, 160, 62);

  doc.text("TRAREYSA", 100, 62);
  doc.text(m.numeroSerie, 40, 62);

  /* =========================
       CHECKLIST PREVENTIVO
    ========================= */
  const checksPreventivo = {
    prev_limpieza_monitor: [69, 87],
    prev_limpieza_interna: [69, 92],
    prev_verificar_conexiones: [69, 97],
    prev_pasta_termica: [69, 102],
    prev_limpieza_ventiladores: [69, 107],
    prev_limpieza_externa: [69, 112],
    prev_limpieza_ram: [69, 117],

    prev_eliminar_temporales: [152, 87],
    prev_actualizacion_software: [152, 92],
    prev_antivirus: [152, 97],
    prev_desinstalar_programas: [152, 102],
  };

  m.tareasPreventivas.forEach((t) => {
    if (checksPreventivo[t]) {
      const [x, y] = checksPreventivo[t];
      doc.text("X", x, y);
    }
  });

  /* =========================
       CHECKLIST CORRECTIVO
    ========================= */
  const checksCorrectivo = {
    // Hardware
    corr_reemplazo_piezas: [69, 152],
    corr_cambio_monitor: [69, 157],
    corr_aumento_ram: [69, 162],

    // Software
    corr_formateo: [152, 152],
    corr_recuperacion_so: [152, 157],
    corr_reinstalacion_software: [152, 162],
    corr_eliminar_virus: [152, 167],
  };

  m.tareasCorrectivas.forEach((t) => {
    if (checksCorrectivo[t]) {
      const [x, y] = checksCorrectivo[t];
      doc.text("X", x, y);
    }
  });

  /* =========================
       FOTOS
    ========================= */
  if (m.fotoAntes) {
    doc.addImage(m.fotoAntes, "PNG", 20, 245, 80, 50);
  }

  if (m.fotoDespues) {
    doc.addImage(m.fotoDespues, "PNG", 110, 245, 80, 50);
  }

  /* =========================
       FIRMAS
    ========================= */
  if (m.firmaTecnico) {
    doc.addImage(m.firmaTecnico, "PNG", 20, 210, 70, 25);
  }

  if (m.firmaEmpleado) {
    doc.addImage(m.firmaEmpleado, "PNG", 120, 210, 70, 25);
  }

  doc.save(`Checklist_Mantenimiento_${m.numeroSerie}.pdf`);
}

const cronogramaConfig = {
  "ADMINISTRACION Y FINANZAS": {
    color: "#e53935",
    rangos: {
      1: [[18, 20]],
      7: [[18, 20]],
    },
  },

  "VARIAS BASES FORANEAS": {
    color: "#00bcd4",
    rangos: {
      2: [[12, 16]],
      8: [[12, 16]],
    },
  },

  "BASE VILLAHERMOSA": {
    color: "#1565c0",
    rangos: {
      3: [[8, 11]],
      9: [[22, 27]],
    },
  },

  "CAPACITACIÓN Y CALIDAD": {
    color: "#7cb342",
    rangos: {
      4: [[2, 8]],
      10: [[25, 27]],
    },
  },

  "BASE VERACRUZ": {
    color: "#0288d1",
    rangos: {
      5: [[5, 8]],
      11: [[20, 24]],
    },
  },

  // 👉 aquí agregas TODAS las áreas tal cual tu Excel
};

function diasMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

const btnCronograma = document.getElementById("btnCronograma");
const cronogramaSection = document.getElementById("cronogramaExactoSection");

btnCronograma.addEventListener("click", () => {
  // Oculta TODAS las secciones
  document
    .querySelectorAll("main section")
    .forEach((sec) => sec.classList.add("oculto"));

  // Muestra cronograma
  cronogramaSection.classList.remove("oculto");

  // Quita activo a botones
  document
    .querySelectorAll("nav button")
    .forEach((btn) => btn.classList.remove("activo"));

  // Activa botón cronograma
  btnCronograma.classList.add("activo");

  // Renderiza cronograma
  renderCronogramaExacto();
});

function renderCronogramaExacto() {
  const anio = 2026;

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const thead = document.getElementById("headCronogramaExacto");
  const tbody = document.getElementById("bodyCronogramaExacto");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  /* ===== ENCABEZADO ===== */
  const filaHead = document.createElement("tr");
  filaHead.innerHTML = `<th>Área</th><th>Mes / Día</th>`;

  for (let d = 1; d <= 31; d++) filaHead.innerHTML += `<th>${d}</th>`;
  thead.appendChild(filaHead);

  /* ===== CUERPO ===== */
  meses.forEach((mesNombre, index) => {
    const mes = index + 1;
    const tr = document.createElement("tr");

    /* --- columna áreas (visual) --- */
    let areasHTML = "";
    Object.entries(cronogramaConfig).forEach(([area, cfg]) => {
      areasHTML += `
        <div class="area-tag" style="background:${cfg.color}">
          ${area}
        </div>`;
    });

    tr.innerHTML = `
      <td class="areas-col">${areasHTML}</td>
      <td class="mes-col">${mesNombre}</td>
    `;

    const totalDias = diasMes(anio, mes);

    for (let d = 1; d <= 31; d++) {
      if (d > totalDias) {
        tr.innerHTML += `<td class="asterisco">*</td>`;
        continue;
      }

      let color = "";
      let title = "";

      Object.entries(cronogramaConfig).forEach(([area, cfg]) => {
        const rangos = cfg.rangos[mes] || [];
        if (rangos.some(([ini, fin]) => d >= ini && d <= fin)) {
          color = cfg.color;
          title = area;
        }
      });

      tr.innerHTML += `
        <td style="${color ? `background:${color}` : ""}"
            title="${title}">
          ${d}
        </td>`;
    }

    tbody.appendChild(tr);
  });
}

function generarExcelMensual(mes, anio, programados = 8) {
  const realizadosMes = mantenimientos.filter((m) => {
    const f = new Date(m.fecha);
    return f.getMonth() + 1 === mes && f.getFullYear() === anio;
  });

  if (realizadosMes.length === 0) {
    alert("No hay mantenimientos en este mes");
    return;
  }

  /* =============================
     TABLA PRINCIPAL (A-D)
  ============================= */
  const tabla = realizadosMes.map((m) => ({
    "EQUIPO / COLABORADOR": m.nombreEmpleado,
    DEPARTAMENTO: m.departamento,
    ESTADO: "REALIZADO",
    EQUIPO: m.numeroSerie,
  }));

  const ws = XLSX.utils.json_to_sheet(tabla, { origin: "A1" });

  /* =============================
     RESUMEN (F)
  ============================= */
  const realizados = realizadosMes.length;
  const noRealizados = Math.max(programados - realizados, 0);
  const porcentaje = Math.round((realizados / programados) * 100);

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [],
      ["", "", "", "", "MTTOS PROGRAMADOS =", programados],
      ["", "", "", "", "REALIZADOS =", realizados],
      ["", "", "", "", "NO REALIZADOS =", noRealizados],
      [],
      ["", "", "", "", `${porcentaje}% REALIZADO`],
      [],
      ["", "", "", "", "NOTA: Los no realizados fue por falta de tiempo."],
    ],
    { origin: "E2" }
  );

  /* =============================
     AJUSTES VISUALES
  ============================= */
  ws["!cols"] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 5 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte Mensual");

  const mesesTexto = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  XLSX.writeFile(wb, `MTTO_${mesesTexto[mes - 1]}_${anio}.xlsx`);
}
