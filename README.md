
# MediClinic SaaS Platform

Plataforma integral de gestión médica multi-tenant con IA conversacional activa.

## Variables de Entorno (Obligatorias)

### Railway / Server Side
- `SUPABASE_URL`: URL del proyecto de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave maestra (NUNCA exponer en frontend).
- `PORT`: Puerto del servidor (Railway lo asigna automáticamente).
- `VOXIMPLANT_API_KEY`: Clave API para telefonía.
- `VOXIMPLANT_ACCOUNT_ID`: ID de cuenta Voximplant.
- `API_KEY`: Google Gemini API Key.

### Frontend (Vite)
- `VITE_SUPABASE_URL`: Misma URL de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave anónima para RLS.

## Ejecución Local

1. Instalar dependencias: `npm install`
2. Ejecutar frontend: `npm run dev`
3. Ejecutar servidor: `npm run server` (Asegúrate de tener un archivo `.env` en la raíz).

## Despliegue en Railway

El sistema está configurado para un **Single Deployment**:
- El comando `npm run build` genera el bundle de React en `/dist`.
- El servidor Express sirve `/dist` como contenido estático y expone la API en `/api/*`.
- Railway detectará el `package.json` y el script `start`.

## Estructura de Supabase (SQL Requerido)

Tablas mínimas en el esquema `public`:
- `clinics` (id, name, owner_id)
- `users` (id, clinic_id, full_name, role, is_active, username)
- `tenant_settings` (clinic_id PK, settings jsonb)
- `clinic_members` (clinic_id, user_id, role)
- `subscriptions` (clinic_id, plan, status, limits jsonb)
- `clinic_phone_numbers` (clinic_id, phone_number, provider, country, active, settings jsonb)

Habilitar RLS en todas las tablas para filtrar por `clinic_id`.
