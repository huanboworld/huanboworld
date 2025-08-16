const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const multer = require('multer');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs-extra');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS配置
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.huanbo-logistics.com', 'https://huanbo-logistics.com']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// 请求日志
app.use(morgan('combined'));

// 解析请求体
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname), {
    maxAge: '1d', // 缓存1天
    etag: true
}));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: {
        error: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// 表单提交速率限制（更严格）
const formLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 5, // 限制每个IP 1小时内最多5次表单提交
    message: {
        error: '表单提交过于频繁，请1小时后再试'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

// 邮件配置
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.qq.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'info@huanbo-logistics.com',
            pass: process.env.SMTP_PASS || 'your-email-password'
        }
    });
};

// 文件上传配置
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 3 // 最多3个文件
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    }
});

// 表单验证规则
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('姓名必须在2-50个字符之间')
        .matches(/^[\u4e00-\u9fa5a-zA-Z\s]+$/)
        .withMessage('姓名只能包含中文、英文和空格'),
    
    body('contact')
        .trim()
        .custom((value) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!emailRegex.test(value) && !phoneRegex.test(value)) {
                throw new Error('请输入有效的邮箱地址或手机号码');
            }
            return true;
        }),
    
    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('公司名称不能超过100个字符'),
    
    body('service-type')
        .optional()
        .isIn(['海运', '空运', '陆运', '清关', '仓储', '综合', '其他'])
        .withMessage('请选择有效的服务类型'),
    
    body('cargo-type')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('货物类型不能超过100个字符'),
    
    body('destination')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('目的地不能超过100个字符'),
    
    body('message')
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('需求描述必须在10-2000个字符之间')
];

// 根路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API路由 - 联系表单提交
app.post('/api/contact', formLimiter, upload.none(), contactValidation, async (req, res) => {
    try {
        // 验证输入
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '表单验证失败',
                errors: errors.array()
            });
        }

        const {
            name,
            contact,
            company = '',
            'service-type': serviceType = '',
            'cargo-type': cargoType = '',
            destination = '',
            message
        } = req.body;

        // 保存到本地文件（简单的存储方案）
        const submissionData = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            name,
            contact,
            company,
            serviceType,
            cargoType,
            destination,
            message,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        // 确保数据目录存在
        const dataDir = path.join(__dirname, 'data');
        await fs.ensureDir(dataDir);

        // 保存到JSON文件
        const dataFile = path.join(dataDir, 'submissions.json');
        let submissions = [];
        
        try {
            if (await fs.pathExists(dataFile)) {
                submissions = await fs.readJson(dataFile);
            }
        } catch (error) {
            console.error('读取提交数据失败:', error);
        }

        submissions.push(submissionData);
        await fs.writeJson(dataFile, submissions, { spaces: 2 });

        // 发送邮件通知
        try {
            const transporter = createTransporter();
            
            // 给公司发送通知邮件
            const companyMailOptions = {
                from: process.env.SMTP_USER || 'info@huanbo-logistics.com',
                to: process.env.COMPANY_EMAIL || 'info@huanbo-logistics.com',
                subject: `【新客户咨询】来自 ${name} 的物流需求`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 10px;">
                            新的客户咨询
                        </h2>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #2d3748; margin-top: 0;">客户信息</h3>
                            <p><strong>姓名:</strong> ${name}</p>
                            <p><strong>联系方式:</strong> ${contact}</p>
                            <p><strong>公司名称:</strong> ${company || '未填写'}</p>
                            <p><strong>服务类型:</strong> ${serviceType || '未选择'}</p>
                            <p><strong>货物类型:</strong> ${cargoType || '未填写'}</p>
                            <p><strong>目的地:</strong> ${destination || '未填写'}</p>
                        </div>
                        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h3 style="color: #2d3748; margin-top: 0;">详细需求</h3>
                            <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
                        </div>
                        <div style="margin-top: 20px; padding: 15px; background: #edf2f7; border-radius: 8px; font-size: 12px; color: #718096;">
                            <p><strong>提交时间:</strong> ${new Date(submissionData.timestamp).toLocaleString('zh-CN')}</p>
                            <p><strong>客户端IP:</strong> ${submissionData.ip}</p>
                            <p><strong>提交ID:</strong> ${submissionData.id}</p>
                        </div>
                    </div>
                `
            };

            // 给客户发送确认邮件
            const customerMailOptions = {
                from: process.env.SMTP_USER || 'info@huanbo-logistics.com',
                to: contact.includes('@') ? contact : null,
                subject: '感谢您的咨询 - 环博物流',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2c5282; font-size: 28px;">环博物流</h1>
                            <p style="color: #718096;">专业的国际货运与进出口服务</p>
                        </div>
                        
                        <h2 style="color: #2d3748;">尊敬的 ${name}，您好！</h2>
                        
                        <p style="line-height: 1.6; color: #4a5568;">
                            感谢您选择环博物流！我们已经收到您的咨询信息，我们的专业团队会在24小时内与您联系，为您提供最优质的物流解决方案。
                        </p>
                        
                        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2c5282;">
                            <h3 style="color: #2d3748; margin-top: 0;">您的咨询信息</h3>
                            <p><strong>咨询编号:</strong> ${submissionData.id}</p>
                            <p><strong>提交时间:</strong> ${new Date(submissionData.timestamp).toLocaleString('zh-CN')}</p>
                            <p><strong>服务类型:</strong> ${serviceType || '未选择'}</p>
                        </div>
                        
                        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #2d3748; margin-top: 0;">联系我们</h3>
                            <p><strong>客服电话:</strong> +86 400-123-4567</p>
                            <p><strong>邮箱:</strong> info@huanbo-logistics.com</p>
                            <p><strong>地址:</strong> 上海市浦东新区物流大道123号</p>
                            <p><strong>营业时间:</strong> 周一至周日 8:00-20:00</p>
                        </div>
                        
                        <p style="text-align: center; color: #718096; font-size: 14px; margin-top: 30px;">
                            此邮件为系统自动发送，请勿直接回复。如有疑问，请联系我们的客服团队。
                        </p>
                    </div>
                `
            };

            // 发送邮件
            await transporter.sendMail(companyMailOptions);
            console.log('公司通知邮件发送成功');

            if (customerMailOptions.to) {
                await transporter.sendMail(customerMailOptions);
                console.log('客户确认邮件发送成功');
            }

        } catch (emailError) {
            console.error('邮件发送失败:', emailError);
            // 邮件发送失败不影响表单提交成功
        }

        res.json({
            success: true,
            message: '感谢您的咨询！我们已收到您的信息，会尽快与您联系。',
            submissionId: submissionData.id
        });

    } catch (error) {
        console.error('表单处理错误:', error);
        res.status(500).json({
            success: false,
            message: '系统繁忙，请稍后重试或直接联系我们的客服。'
        });
    }
});

// API路由 - 获取提交统计（管理员功能）
app.get('/api/admin/stats', async (req, res) => {
    try {
        // 简单的认证（生产环境应使用更安全的认证方式）
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN || 'admin-secret-token'}`) {
            return res.status(401).json({ error: '未授权访问' });
        }

        const dataFile = path.join(__dirname, 'data', 'submissions.json');
        let submissions = [];
        
        if (await fs.pathExists(dataFile)) {
            submissions = await fs.readJson(dataFile);
        }

        const stats = {
            total: submissions.length,
            today: submissions.filter(s => {
                const today = new Date().toDateString();
                const submissionDate = new Date(s.timestamp).toDateString();
                return today === submissionDate;
            }).length,
            thisWeek: submissions.filter(s => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(s.timestamp) >= weekAgo;
            }).length,
            serviceTypes: submissions.reduce((acc, s) => {
                const type = s.serviceType || '未选择';
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {})
        };

        res.json(stats);
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('服务器错误:', error);
    res.status(500).json({
        error: '服务器内部错误',
        message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 环博物流网站服务器启动成功!`);
    console.log(`📡 服务器地址: http://localhost:${PORT}`);
    console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，正在优雅关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在优雅关闭服务器...');
    process.exit(0);
});

module.exports = app;
