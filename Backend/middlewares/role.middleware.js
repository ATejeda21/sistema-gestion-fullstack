export function requireRole(roles = []) {
  return (req, res, next) => {
    const role = req.headers['x-role'];
    if (!role) return res.status(401).json({ ok:false, error: 'Falta header x-role' });
    if (roles.length && !roles.includes(role)) {
      return res.status(403).json({ ok:false, error: `Rol ${role} no autorizado` });
    }
    next();
  };
}