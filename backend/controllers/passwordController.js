const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const transporter = require('../config/email');

// SOLICITAR RESET DE CONTRASEÑA
exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        // 1. Verificar si el usuario existe
        const [rows] = await db.execute(
            'SELECT * FROM USUARIO WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            // Por seguridad, no revelar que el email no existe
            return res.json({ 
                message: "Si el email existe, recibirás un enlace para resetear tu contraseña" 
            });
        }

        const usuario = rows[0];

        // 2. Generar token único
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // 3. Fecha de expiración (1 hora desde ahora)
        const expireTime = new Date(Date.now() + 3600000); // 1 hora

        // 4. Guardar token en la base de datos
        await db.execute(
            'UPDATE USUARIO SET reset_token = ?, reset_token_expire = ? WHERE id_usuario = ?',
            [resetTokenHash, expireTime, usuario.id_usuario]
        );

        // 5. Crear URL de reset
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

        // 6. Configurar el email
        const mailOptions = {
            from: `"Sistema de Gestión" <${process.env.EMAIL_FROM}>`,
            to: usuario.email,
            subject: 'Recuperación de Contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Recuperación de Contraseña</h2>
                    
                    <p>Hola <strong>${usuario.nombre}</strong>,</p>
                    
                    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;">Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
                        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">
                            Restablecer Contraseña
                        </a>
                    </div>
                    
                    <p>Este enlace expirará en <strong>1 hora</strong>.</p>
                    
                    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    
                    <p style="color: #64748b; font-size: 12px;">
                        Este es un correo automático, por favor no respondas a este mensaje.
                    </p>
                </div>
            `
        };

        // 7. Enviar email
        await transporter.sendMail(mailOptions);

        res.json({ 
            message: "Si el email existe, recibirás un enlace para resetear tu contraseña",
            // En desarrollo, puedes mostrar el token (solo para testing)
            token: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error('Error en recuperación de contraseña:', error);
        res.status(500).json({ error: "Error al procesar la solicitud" });
    }
};

// VERIFICAR TOKEN DE RESET
exports.verifyResetToken = async (req, res) => {
    const { token } = req.params;

    try {
        // Hash el token recibido
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Buscar usuario con token válido y no expirado
        const [rows] = await db.execute(
            'SELECT id_usuario, email, reset_token_expire FROM USUARIO WHERE reset_token = ?',
            [resetTokenHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ 
                valid: false,
                message: "Token inválido o expirado" 
            });
        }

        const usuario = rows[0];

        // Verificar si el token ha expirado
        const now = new Date();
        if (usuario.reset_token_expire < now) {
            return res.status(400).json({ 
                valid: false,
                message: "El token ha expirado" 
            });
        }

        res.json({ 
            valid: true,
            email: usuario.email,
            message: "Token válido" 
        });

    } catch (error) {
        console.error('Error verificando token:', error);
        res.status(500).json({ error: "Error al verificar el token" });
    }
};

// RESETEAR CONTRASEÑA
exports.resetPassword = async (req, res) => {
    const { token, password } = req.body;

    try {
        // Hash el token recibido
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Buscar usuario con token válido y no expirado
        const [rows] = await db.execute(
            'SELECT id_usuario, reset_token_expire FROM USUARIO WHERE reset_token = ?',
            [resetTokenHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ 
                message: "Token inválido o expirado" 
            });
        }

        const usuario = rows[0];

        // Verificar si el token ha expirado
        const now = new Date();
        if (usuario.reset_token_expire < now) {
            return res.status(400).json({ 
                message: "El token ha expirado" 
            });
        }

        // Encriptar nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Actualizar contraseña y limpiar token
        await db.execute(
            'UPDATE USUARIO SET password = ?, reset_token = NULL, reset_token_expire = NULL WHERE id_usuario = ?',
            [hashedPassword, usuario.id_usuario]
        );

        // Enviar email de confirmación
        const [userData] = await db.execute(
            'SELECT email, nombre FROM USUARIO WHERE id_usuario = ?',
            [usuario.id_usuario]
        );

        if (userData.length > 0) {
            const mailOptions = {
                from: `"Sistema de Gestión" <${process.env.EMAIL_FROM}>`,
                to: userData[0].email,
                subject: 'Contraseña Actualizada',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #10b981;">Contraseña Actualizada</h2>
                        
                        <p>Hola <strong>${userData[0].nombre}</strong>,</p>
                        
                        <p>Tu contraseña ha sido actualizada exitosamente.</p>
                        
                        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #065f46;">
                                ✅ La contraseña de tu cuenta ha sido cambiada.
                            </p>
                        </div>
                        
                        <p>Si no realizaste este cambio, por favor contacta al administrador del sistema inmediatamente.</p>
                        
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                        
                        <p style="color: #64748b; font-size: 12px;">
                            Este es un correo automático, por favor no respondas a este mensaje.
                        </p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
        }

        res.json({ 
            message: "Contraseña actualizada exitosamente" 
        });

    } catch (error) {
        console.error('Error reseteando contraseña:', error);
        res.status(500).json({ error: "Error al resetear la contraseña" });
    }
};