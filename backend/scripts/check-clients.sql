-- Consulta para verificar usuarios y clientes registrados
SELECT 'Usuarios registrados:' as info;
SELECT id, email, name, role FROM "User";

SELECT 'Empresas registradas:' as info;
SELECT id, "companyName", "businessSector", "createdAt" FROM "Client";
