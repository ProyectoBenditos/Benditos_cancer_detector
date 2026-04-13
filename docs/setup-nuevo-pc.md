# Guía de Instalación - OncaScan Platform

Esta guía detalla los pasos necesarios para configurar y ejecutar el proyecto desde cero en una nueva computadora.

## 📋 Requisitos Previos

Asegúrate de tener instalado lo siguiente:

1.  **Git**: [Descargar aquí](https://git-scm.com/)
2.  **Node.js (v20+)**: [Descargar aquí](https://nodejs.org/)
3.  **Python (v3.11+)**: [Descargar aquí](https://www.python.org/)
4.  **Visual Studio Code** (Recomendado): [Descargar aquí](https://code.visualstudio.com/)

---

## 🚀 Pasos Iniciales

### 1. Clonar el repositorio
Abre una terminal y ejecuta:
```bash
git clone https://github.com/TU_USUARIO/Benditos_cancer_detector.git
cd Benditos_cancer_detector
```

---

## 🐍 Configuración del Backend (API)

El backend está desarrollado con FastAPI y requiere un entorno virtual de Python.

1.  **Entrar a la carpeta del API:**
    ```bash
    cd apps/api
    ```

2.  **Crear un entorno virtual:**
    ```bash
    python -m venv .venv
    ```

3.  **Activar el entorno virtual:**
    *   **Windows:**
        ```powershell
        .\.venv\Scripts\Activate
        ```
    *   **macOS/Linux:**
        ```bash
        source .venv/bin/activate
        ```

4.  **Instalar dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Configurar variables de entorno:**
    Crea un archivo `.env` en `apps/api/` con el siguiente contenido (solicita las llaves reales al administrador):
    ```env
    SUPABASE_URL=https://tu-proyecto.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
    SUPABASE_BUCKET_NAME=dicom-files
    ```

6.  **Ejecutar el backend:**
    ```bash
    fastapi dev app/main.py
    ```
    El API estará disponible en `http://127.0.0.1:8000`.

---

## 🌐 Configuración del Frontend (Web)

El frontend está desarrollado con Next.js y React.

1.  **Entrar a la carpeta web (desde la raíz del proyecto):**
    ```bash
    cd apps/web
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env.local` en `apps/web/` con el siguiente contenido:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
    ```

4.  **Ejecutar el frontend:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000`.

---

## 🗄️ Configuración de Supabase

Para que el proyecto funcione correctamente, necesitas:

1.  **Proyecto en Supabase**: Crear un nuevo proyecto.
2.  **Storage**: Crear un bucket llamado `dicom-files` y hacerlo público o configurar políticas RLS para acceso autenticado.
3.  **Auth**: Configurar los proveedores de autenticación necesarios (Email/Password habilitado por defecto).
4.  **Base de Datos**: Las tablas se crearán automáticamente si utilizas migraciones, de lo contrario, asegúrate de tener la estructura de `historial` y `perfiles`.

---

## ✅ Verificación Final (Smoke Test)

1.  Accede a `http://localhost:3000`.
2.  Inicia sesión o regístrate.
3.  Intenta subir un archivo DICOM de prueba.
4.  Verifica que el API reciba la petición y procese el archivo correctamente.

---

## 🛠️ Solución de Problemas

*   **Error de CORS**: Asegúrate de que `http://localhost:3000` esté en la lista blanca de CORS de Supabase y del API.
*   **Modulo no encontrado en Python**: Verifica que el entorno virtual (`.venv`) esté activado antes de correr `fastapi`.
*   **Versión de Node**: Si tienes problemas con `npm install`, usa Node 20 o superior.
