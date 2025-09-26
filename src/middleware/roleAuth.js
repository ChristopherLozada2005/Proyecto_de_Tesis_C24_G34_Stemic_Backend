/**
 * Middleware para validación de roles de usuario
 */

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Acceso no autorizado. Se requiere autenticación.'
        });
      }

      // Verificar que el usuario tenga uno de los roles permitidos
      if (!allowedRoles.includes(req.user.rol)) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere rol: ${allowedRoles.join(' o ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Error en verificación de rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// Middlewares específicos para roles comunes
const requireOrganizadorOrAdmin = requireRole(['organizador', 'admin']);
const requireAdmin = requireRole(['admin']);
const requireOrganizador = requireRole(['organizador']);

module.exports = {
  requireRole,
  requireOrganizadorOrAdmin,
  requireAdmin,
  requireOrganizador
};
