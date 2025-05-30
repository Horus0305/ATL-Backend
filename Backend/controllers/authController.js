const User = require('../models/User');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper function to verify Werkzeug password hash
function verifyPassword(password, hashedPassword) {
  try {
    // Parse the Werkzeug hash format: method:digest:iterations$salt$hash
    const [methodString, salt, storedHash] = hashedPassword.split('$');
    const [method, digest, iterations] = methodString.split(':');

    if (method !== 'pbkdf2') {
      console.error('Unsupported hash method:', method);
      return false;
    }

    const iterCount = parseInt(iterations);

    // Werkzeug treats the password as UTF-8 bytes
    const passwordBytes = Buffer.from(password, 'utf8');
    const saltBytes = Buffer.from(salt, 'base64');

    // Use PBKDF2 with same parameters as Werkzeug
    const key = crypto.pbkdf2Sync(
      passwordBytes,
      saltBytes,
      iterCount,
      32,  // 32 bytes = 256 bits for sha256
      'sha256'
    );

    // Convert to base64 first (like Werkzeug) then to hex
    const calculatedHash = Buffer.from(key).toString('base64');
    const calculatedHex = Buffer.from(calculatedHash, 'base64').toString('hex');

    console.log('Password verification:', {
      method: methodString,
      salt: salt,
      iterations: iterCount,
      calculatedBase64: calculatedHash,
      calculatedHex: calculatedHex,
      storedHash: storedHash,
      matches: calculatedHex === storedHash
    });

    return calculatedHex === storedHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'User Does Not Exists' });
    }

    const isValidPassword = verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ ok: false, error: 'Incorrect Password Try Again' });
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.SECRET_KEY
    );

    return res.status(201).json({
      token: token,
      role: user.role,
      email: user.email,
      username: username,
      ok: true
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
};

exports.register = async (req, res) => {
  try {
    const { firstname, lastname, email, username, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ error: "This Email-Id already exists", ok: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      firstname,
      lastname,
      email,
      username,
      password: hashedPassword,
      role
    });

    res.json({ data: newUser, ok: true });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendDetails = async (req, res) => {
  try {
    const { email, name, username, password, role } = req.body;
    
    const roleText = role === 0 ? 'CEO' : 
                    role === 1 ? 'Supervisor' :
                    role === 2 ? 'Tester' : 'Receptionist';

    const html = `
      <h2>Hello ${name}</h2>
      <br/>
      <p>Here's your auth details</p>
      <br/>
      <p>
        username: ${username}<br/>
        password: ${password}<br/>
        role: ${roleText}
      </p>
    `;

    const response = await sendEmail(email, 'Account Details', html);
    res.json({ code: response[0].statusCode, ok: true });
  } catch (error) {
    console.error('Send details error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.checkUser = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });
    
    if (user) {
      res.json({ data: user, ok: true });
    } else {
      res.json({ error: "User Does not Exists", ok: false });
    }
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.sendReset = async (req, res) => {
  try {
    const { username, email } = req.body;
    const link = `${process.env.FRONTEND_URL}/reset_password/${username}`;

    const msg = {
      to: email,
      from: 'reactflaskuser@gmail.com',
      subject: 'Reset Password',
      html: `<h2>Hello ${username}</h2><p>Here's link for reseting user password</p><a href=${link} target="_blank">Click Here</a>`
    };

    const response = await sgMail.send(msg);
    res.json({ code: response[0].statusCode, ok: true });
  } catch (error) {
    console.error('Send reset error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.findOneAndUpdate(
      { username },
      { password: hashedPassword }
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username })
      .select('-password'); // Exclude password from response
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstname, lastname, email } = req.body;
    
    const user = await User.findOneAndUpdate(
      { username: req.user.username },
      { firstname, lastname, email },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { username: user.username },
    process.env.SECRET_KEY,
    { expiresIn: '24h' }
  );
};

// Helper function to send email if SendGrid is configured
const sendEmail = async (to, subject, html) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured. Email would have been sent to:', to);
    console.log('Subject:', subject);
    console.log('Content:', html);
    return { statusCode: 200 }; // Mock successful response
  }

  const msg = {
    to,
    from: 'reactflaskuser@gmail.com',
    subject,
    html
  };

  try {
    const response = await sgMail.send(msg);
    return response[0];
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}; 