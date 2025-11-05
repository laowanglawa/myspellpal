from flask import Blueprint, request, jsonify
from datetime import datetime
from ..models.user import User
from ..app import db

# 创建蓝图
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not all(key in data for key in ['username', 'email', 'password']):
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 检查用户名是否已存在
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'success': False, 'message': '用户名已存在'}), 400
        
        # 检查邮箱是否已存在
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'success': False, 'message': '邮箱已被注册'}), 400
        
        # 创建新用户
        new_user = User(
            username=data['username'],
            email=data['email']
        )
        new_user.set_password(data['password'])
        
        # 保存到数据库
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '注册成功', 'user': new_user.to_dict()}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'注册失败: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not all(key in data for key in ['username', 'password']):
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 查找用户
        user = User.query.filter_by(username=data['username']).first()
        
        # 验证用户和密码
        if not user or not user.check_password(data['password']):
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
        
        # 更新最后登录时间
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # 返回用户信息
        return jsonify({
            'success': True, 
            'message': '登录成功', 
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'登录失败: {str(e)}'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """重置密码"""
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not all(key in data for key in ['username', 'new_password']):
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 查找用户
        user = User.query.filter_by(username=data['username']).first()
        
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 设置新密码
        user.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({'success': True, 'message': '密码重置成功'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'密码重置失败: {str(e)}'}), 500

@auth_bp.route('/verify-user/<username>', methods=['GET'])
def verify_user(username):
    """验证用户是否存在"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if user:
            return jsonify({'success': True, 'exists': True}), 200
        else:
            # 检查是否是测试账号
            test_accounts = ['test', 'admin']
            if username in test_accounts:
                return jsonify({'success': True, 'exists': True, 'is_test_account': True}), 200
            return jsonify({'success': True, 'exists': False}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'验证失败: {str(e)}'}), 500
