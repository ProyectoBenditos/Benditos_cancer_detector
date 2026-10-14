# nv reason ct

## Enlaces a Investigar

* [HuggingFace - vLLM-sr Decision 30](https://huggingface.co/collections/vllm-sr/decision-30)
* [MONAI Physio - Installation](https://project-monai.github.io/monai-physio/installation.html)
* [Nature Article (s41591-026-04626-w)](https://www.nature.com/articles/s41591-026-04626-w)
* [RSNA News - Lung Cancer CT Screening (Oct 2026)](https://www.rsna.org/news/2026/october/lung-cancer-ct-screening)
* [NVIDIA Clara - Medical Imaging](https://www.nvidia.com/es-la/clara/medical-imaging/)
* [Project MONAI](https://project-monai.github.io)
* [NVIDIA NGC Catalog - MONAI Lung Nodule CT Detection](https://catalog.ngc.nvidia.com/orgs/nvidia/monaitoolkit/models/monai_lung_nodule_ct_detection/-?_lr=1)
* [Google Research Blog - Toward provably private learning from federated data](https://research.google/blog/toward-provably-private-learning-from-federated-data/?utm_source=linkedin&utm_medium=social&utm_campaign=social_post&utm_content=gr-acct)

---

## Notas de Investigación Adicionales

### nnFoundation: 3D Foundation Models for Radiology
Pretraining on 2.1 million CT, MRI and PET scans produced radiology AI models that beat earlier foundation models across 108 tasks, but no single model led every type of task.

1. Most radiology AI is trained for one task on expert-labeled scans, which limits how well it transfers across hospitals.
2. The scans came from 125 clinical, research and public sources and needed no expert labels for pretraining.
3. Across 34 segmentation datasets, none of seven earlier foundation models beat a standard tool trained separately on each dataset.
4. One of the two new models beat it, by 1.9 points on a 100-point overlap score.
5. The other new model led on whole-scan tasks such as classification, image search and report writing.
6. On classification, the top four models showed no significant difference, all scoring around 0.75, where 0.5 is chance.
7. Reshaping the pretrained network to fit each dataset added 1.2 overlap points across the segmentation datasets.
8. At external partner sites, pretraining added 4.2 overlap points with 10% of training data and 1.1 with all of it.
9. All evaluations were retrospective, and no subgroup or fairness analysis was performed.
10. No single model performed best everywhere; results depended on pretraining scale, architecture choice and fitting to each dataset.

**Referencia:** Constantin Ulrich Harsy, et al. *nnFoundation: 3D Foundation Models for Radiology*. arXiv. 2026. DOI: 10.48550/arXiv.2609.26924 | Open Access

---

### Notas de la Imagen: Tumor Boundary Segmentation
*   **Problema:** En imágenes médicas (MRI/CT), los límites de los tumores pueden ser irregulares, infiltrativos y difíciles de distinguir del tejido circundante (bajo contraste, apariencia similar).
*   **Solución técnica propuesta:** Aprendizaje consciente de los límites (Boundary-aware learning) combinado con modelado de incertidumbre (uncertainty modeling).
*   **Flujo:** MRI/CT $\rightarrow$ Segmentación $\rightarrow$ Conciencia de límites $\rightarrow$ Incertidumbre $\rightarrow$ Contorno refinado.
