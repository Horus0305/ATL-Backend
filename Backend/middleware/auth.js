import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        ok: false,
        error: 'Authentication token is required' 
      });
    }

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ 
          ok: false,
          error: 'Invalid or expired token' 
        });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ 
      ok: false,
      error: 'Authentication failed' 
    });
  }
};

export const authenticateToken = verifyToken; 