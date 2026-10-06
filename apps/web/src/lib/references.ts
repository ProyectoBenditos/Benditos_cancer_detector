// Fuentes citadas en la plataforma. Un único catálogo para que todos los
// enlaces de la UI apunten a la misma URL verificada.
// Verificadas el 2026-10-02.

export type ReferenceGroup = "normativa" | "guias" | "datos" | "metodos";

export type Reference = {
    group: ReferenceGroup;
    short: string;
    citation: string;
    url: string;
    note?: string;
};

export const REFERENCE_GROUPS: { id: ReferenceGroup; title: string }[] = [
    { id: "normativa", title: "Normativa colombiana" },
    { id: "guias", title: "Guías clínicas internacionales" },
    { id: "datos", title: "Datos de entrenamiento" },
    { id: "metodos", title: "Modelo y explicabilidad" },
];

export const REFERENCES = {
    gpc36: {
        group: "normativa",
        short: "GPC No. 36 — MinSalud 2014",
        citation:
            "Ministerio de Salud y Protección Social, Colciencias, Instituto Nacional de Cancerología. Guía de Práctica Clínica para la detección temprana, diagnóstico, estadificación y tratamiento del cáncer de pulmón. Guía No. 36. Bogotá; 2014.",
        url: "https://minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/DE/CA/gpc-cancer-pulmon-profesionales.pdf",
        note: "Rec. 1.1–1.2 (tamización con TAC de baja dosis) y Rec. 2.1 (seguimiento de nódulos según tamaño, criterios ACCP).",
    },
    ley1581: {
        group: "normativa",
        short: "Ley 1581 de 2012",
        citation: "Congreso de la República de Colombia. Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales.",
        url: "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981",
        note: "Los datos de salud son datos sensibles (art. 5).",
    },
    res1995: {
        group: "normativa",
        short: "Resolución 1995 de 1999",
        citation: "Ministerio de Salud. Resolución 1995 de 1999, por la cual se establecen normas para el manejo de la Historia Clínica (con sus modificaciones).",
        url: "https://normograma.supersalud.gov.co/compilacion/docs/resolucion_minsalud_r1995_99.htm",
    },
    decreto4725: {
        group: "normativa",
        short: "Decreto 4725 de 2005",
        citation: "Ministerio de la Protección Social. Decreto 4725 de 2005, régimen de registros sanitarios, permiso de comercialización y vigilancia sanitaria de los dispositivos médicos para uso humano.",
        url: "https://observatorios.invima.gov.co/invima_website/static/attachments/dispositivos_dispositivos_medicos_equipos_biomedicos/Decreto-4725-de-2005.pdf",
        note: "Un software con finalidad diagnóstica puede ser dispositivo médico (arts. 6–7). OncoScan no tiene registro sanitario INVIMA.",
    },
    dicomPs315: {
        group: "normativa",
        short: "DICOM PS 3.15 (Anexo E)",
        citation:
            "National Electrical Manufacturers Association (NEMA). DICOM Standard PS 3.15: Security and System Management Profiles, Annex E - Basic Application Level Confidentiality Profile; 2023.",
        url: "https://dicom.nema.org/medical/dicom/current/output/chtml/part15/chapter_E.html",
        note: "Protocolo estándar internacional para desidentificación y purgado de PHI en cabeceras de imágenes médicas sin alterar la física radiológica.",
    },
    accp2013: {
        group: "guias",
        short: "ACCP 2013 (Gould et al.)",
        citation:
            "Gould MK, Donington J, Lynch WR, et al. Evaluation of individuals with pulmonary nodules: when is it lung cancer? Diagnosis and management of lung cancer, 3rd ed: ACCP evidence-based clinical practice guidelines. Chest. 2013;143(5 Suppl):e93S–e120S.",
        url: "https://doi.org/10.1378/chest.12-2351",
        note: "Probabilidad de malignidad: muy baja (<5%), baja–moderada (5–65%), alta (>65%).",
    },
    fleischner2017: {
        group: "guias",
        short: "Fleischner Society 2017",
        citation:
            "MacMahon H, Naidich DP, Goo JM, et al. Guidelines for management of incidental pulmonary nodules detected on CT images: from the Fleischner Society 2017. Radiology. 2017;284(1):228–243.",
        url: "https://doi.org/10.1148/radiol.2017161659",
    },
    lungRads: {
        group: "guias",
        short: "ACR Lung-RADS v2022",
        citation: "American College of Radiology. Lung CT Screening Reporting & Data System (Lung-RADS) v2022.",
        url: "https://www.acr.org/Clinical-Resources/Clinical-Tools-and-Reference/Reporting-and-Data-Systems/Lung-RADS",
    },
    lidcData: {
        group: "datos",
        short: "LIDC-IDRI (TCIA)",
        citation:
            "Armato SG III, McLennan G, Bidaut L, et al. Data From LIDC-IDRI [Data set]. The Cancer Imaging Archive; 2015. doi:10.7937/K9/TCIA.2015.LO9QL9SX",
        url: "https://www.cancerimagingarchive.net/collection/lidc-idri/",
        note: "Licencia CC BY 3.0.",
    },
    lidcPaper: {
        group: "datos",
        short: "Armato et al., 2011",
        citation:
            "Armato SG III, McLennan G, Bidaut L, et al. The Lung Image Database Consortium (LIDC) and Image Database Resource Initiative (IDRI): a completed reference database of lung nodules on CT scans. Med Phys. 2011;38(2):915–931.",
        url: "https://doi.org/10.1118/1.3528204",
        note: "Describe la anotación por 4 radiólogos y las 8 características del nódulo (sutileza, calcificación, etc.).",
    },
    resnet: {
        group: "metodos",
        short: "ResNet (He et al., 2016)",
        citation: "He K, Zhang X, Ren S, Sun J. Deep Residual Learning for Image Recognition. CVPR 2016.",
        url: "https://arxiv.org/abs/1512.03385",
    },
    gradcam: {
        group: "metodos",
        short: "Grad-CAM (Selvaraju et al., 2017)",
        citation:
            "Selvaraju RR, Cogswell M, Das A, et al. Grad-CAM: Visual Explanations from Deep Networks via Gradient-based Localization. ICCV 2017.",
        url: "https://arxiv.org/abs/1610.02391",
    },
    inferenceService: {
        group: "metodos",
        short: "Servicio de inferencia (código)",
        citation: "OncoScan. Microservicio del modelo IA (service.py) en Hugging Face Spaces.",
        url: "https://huggingface.co/spaces/LuisDam/oncoscan-ai/blob/main/service.py",
        note: "Define los cortes de riesgo en la función nivel_riesgo().",
    },
} satisfies Record<string, Reference>;

export type ReferenceId = keyof typeof REFERENCES;
