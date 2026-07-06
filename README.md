# HSQE · PL Offshore — INTEGRA

Módulo de gestión HSQE (Health, Safety, Quality, Environment) para PL Offshore,
parte del ecosistema INTEGRA del Grupo Paraná Logística.

## Stack
- Vite + JavaScript (vanilla) + Chart.js
- Supabase (auth compartida INTEGRA + Postgres + Storage)
- Deploy en Vercel

## Variables de entorno (Vercel → Settings → Environment Variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Backend (ya creado en Supabase mwrhonkvcyyueixbdrat)
- Tablas: `hsqe_registros`, `hsqe_catalogos`, `hsqe_config` (RLS: auth.uid() IS NOT NULL)
- Bucket privado: `hsqe-adjuntos-ploffshore`
- Acceso al módulo controlado por `user_roles.modulos` (id 'hsqe')

## Desarrollo local
```
npm install
cp .env.example .env.local   # completar con la anon key real
npm run dev
```
