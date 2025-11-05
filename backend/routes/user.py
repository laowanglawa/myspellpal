from flask import Blueprint, request, jsonify
from ..models.user import User
from ..app import db

# 创建蓝图
user_bp = Blueprint('user', __name__)

@user_bp.route('/<username>', methods=['GET'])
def get_user(username):
    """获取用户信息"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        return jsonify({'success': True, 'user': user.to_dict()}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取用户信息失败: {str(e)}'}), 500

@user_bp.route('/<username>', methods=['PUT'])
def update_user(username):
    """更新用户信息"""
    try:
        data = request.get_json()
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 更新用户信息（仅更新提供的字段）
        if 'email' in data:
            # 检查邮箱是否已被其他用户使用
            existing_user = User.query.filter(
                User.email == data['email'],
                User.username != username
            ).first()
            
            if existing_user:
                return jsonify({'success': False, 'message': '邮箱已被其他用户使用'}), 400
            
            user.email = data['email']
        
        if 'password' in data:
            user.set_password(data['password'])
        
        # 保存到数据库
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '用户信息更新成功',
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'更新用户信息失败: {str(e)}'}), 500

@user_bp.route('/<username>', methods=['DELETE'])
def delete_user(username):
    """删除用户账户"""
    try:
        user = User.query.filter_by(username=username).first()
        
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 删除用户（由于设置了级联删除，相关的进度记录也会被删除）
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'success': True, 'message': '用户账户已删除'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'删除用户失败: {str(e)}'}), 500

@user_bp.route('/list', methods=['GET'])
def get_all_users():
    """获取所有用户列表（仅用于管理）"""
    try:
        users = User.query.all()
        
        # 转换为字典列表
        user_list = [user.to_dict() for user in users]
        
        return jsonify({
            'success': True,
            'users': user_list,
            'total': len(user_list)
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取用户列表失败: {str(e)}'}), 500
