/**
 * Datos de ejemplo para usar cuando el backend no responde
 * Esto permite que la aplicación funcione offline o cuando el backend está caído
 */

window.MOCK_DATA = {
    // Perfil de usuario
    userProfile: {
        id: "local-user-123",
        name: "Usuario Local",
        email: "usuario@ejemplo.com",
        role: "admin",
        createdAt: new Date().toISOString(),
        client: {
            id: "local-client-123",
            name: "Empresa Demo",
            businessName: "Empresa Demo S.L.",
            sector: "otro",
            businessSector: "otro",
            plan: "básico",
            active: true,
            createdAt: new Date().toISOString(),
            botConfig: {
                welcomeMessage: "¡Bienvenido a nuestra empresa! ¿En qué podemos ayudarte?",
                enabled: true
            },
            emailConfig: {
                signature: "Saludos cordiales,\\nEquipo de Empresa Demo",
                enabled: true
            },
            notificationConfig: {
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true
            }
        }
    },
    
    // Datos para el sector "otro"
    otherSectorData: {
        projects: [
            { id: "p1", name: "Proyecto Demo 1", status: "En progreso", completion: 65, dueDate: "2025-08-15" },
            { id: "p2", name: "Proyecto Demo 2", status: "Pendiente", completion: 20, dueDate: "2025-09-01" },
            { id: "p3", name: "Proyecto Demo 3", status: "Completado", completion: 100, dueDate: "2025-07-10" }
        ],
        tasks: [
            { id: "t1", name: "Tarea 1", status: "Pendiente", projectId: "p1", assignedTo: "Usuario Local" },
            { id: "t2", name: "Tarea 2", status: "En progreso", projectId: "p1", assignedTo: "Usuario Local" },
            { id: "t3", name: "Tarea 3", status: "Completada", projectId: "p2", assignedTo: "Usuario Local" },
            { id: "t4", name: "Tarea 4", status: "Pendiente", projectId: "p3", assignedTo: "Usuario Local" }
        ],
        clients: [
            { id: "c1", name: "Cliente Demo 1", email: "cliente1@ejemplo.com", phone: "600111222" },
            { id: "c2", name: "Cliente Demo 2", email: "cliente2@ejemplo.com", phone: "600333444" },
            { id: "c3", name: "Cliente Demo 3", email: "cliente3@ejemplo.com", phone: "600555666" }
        ],
        stats: {
            projectsCount: 3,
            tasksCount: 4,
            clientsCount: 3,
            completionRate: 61.7
        }
    }
};

console.log('Datos de ejemplo cargados correctamente');
