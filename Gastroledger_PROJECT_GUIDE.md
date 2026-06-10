# Gastroledger - PROJECT GUIDE
**Guía Oficial para el Agente de Desarrollo**

**Proyecto:** Gastroledger - SaaS para Gestión de Negocios Gastronómicos (Basado en el documento "Proyecto saas.pdf")

**Objetivo:** Crear un prototipo funcional completo, profesional, estable y listo para desplegar en Vercel + Supabase.

## 1. Stack Tecnológico (Obligatorio)

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Base de Datos & Backend:** Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **UI:** shadcn/ui + Lucide Icons + Tailwind
- **Estado y Datos:** TanStack Query (React Query) + Supabase Realtime
- **Validación:** Zod + React Hook Form
- **Charts:** Recharts
- **Hosting:** Vercel (Frontend + Server Actions)

**No usar:** Create React App, Redux, Firebase, NestJS, ni otras tecnologías innecesarias.

## 2. Arquitectura Multi-Tenant + Roles (Muy Importante)

- **Superadmin** (Tú): Gestiona todos los negocios.
- **Admin del Negocio**: Dueño/gerente del establecimiento.
- **Cajero / Mesero**
- **Cocinero**

**Regla clave:** Todos usan el **mismo login**. El sistema filtra todo por `business_id` + `role`.

Usar **Row Level Security (RLS)** en Supabase para aislamiento fuerte de tenants.

## 3. Modelo de Datos Principal (Supabase)

### Tablas principales:

- `businesses` (tenants)
  - id, name, type (cafeteria, restaurante, polleria), address, subscription_plan, status, created_at

- `profiles`
  - id (uuid), business_id, full_name, role ('superadmin', 'admin', 'cashier', 'waiter', 'cook'), email, avatar_url

- `menu_items`
  - id, business_id, name, price (numeric), category, description, image_url

- `inventory_items`
  - id, business_id, name, unit, current_stock, min_stock, unit_cost

- `recipes` (relación muchos a muchos)
  - id, menu_item_id, inventory_item_id, quantity

- `tables`
  - id, business_id, table_number, status ('free', 'occupied')

- `orders`
  - id, business_id, table_id, user_id, status ('pending', 'preparing', 'ready', 'paid', 'cancelled'), total (numeric), created_at

- `order_details`
  - id, order_id, menu_item_id, quantity, price_at_time

- `payments`
  - id, order_id, amount, qr_data (json), status, mock_transaction_id

- `subscriptions` (para control de planes)

## 4. Planes de Suscripción (Feature Flags)

- **Esencial**: POS básico, mesas, pedidos, inventario manual
- **Pro**: + Menú digital, QR pagos, Kitchen Display realtime, reportes básicos
- **Premium**: + Recetas y costeo automático, alertas inteligentes, analíticas avanzadas

Implementar feature flags según el plan del negocio.

## 5. Módulos Prioritarios (Orden Recomendado)

1. Setup del proyecto + Supabase Auth + Middleware de roles/tenant
2. Superadmin Dashboard (CRUD de negocios)
3. Perfil y cambio de negocio
4. CRUD de Menú + Inventario básico
5. Gestión de Mesas
6. Sistema POS (Toma de pedidos)
7. Kitchen Display System (Realtime)
8. Generación de QR de pago + simulación de pago
9. Reportes y Dashboard por negocio
10. Gestión de personal (por Admin)

## 6. Reglas Importantes para el Agente

- **Siempre** leer este archivo antes de empezar cualquier tarea.
- Usar TypeScript estrictamente.
- Implementar RLS policies fuertes en Supabase.
- Todo debe ser responsive (mobile-first, especialmente POS y Kitchen).
- Usar Server Actions + TanStack Query (evitar demasiadas API routes innecesarias).
- Realtime obligatorio en: pedidos, cocina y estado de mesas.
- Manejo de errores y loading states consistentes.
- UI limpia, moderna y profesional.
- Todos los cálculos monetarios usar `numeric` o `decimal` (nunca float).
- Incluir seed de datos de prueba (superadmin + 2 negocios de ejemplo).

## 7. Flujos Críticos que Deben Funcionar Perfectamente

- Login → Redirección según rol y negocio.
- Superadmin crea negocio → Admin puede loguearse y configurar.
- Toma de pedido → Envío realtime a cocina.
- Cocina marca "Listo" → Notificación al mesero.
- Pago con QR simulado → Actualización de estado + descuento de inventario.
- Inventario se actualiza automáticamente al pagar.

