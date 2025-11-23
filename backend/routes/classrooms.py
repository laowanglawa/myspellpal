from flask import Blueprint, request, jsonify
from ..models.user import User
from ..models.classroom import Classroom
from ..app import db

# 创建蓝图
classrooms_bp = Blueprint('classrooms', __name__)

@classrooms_bp.route('/create', methods=['POST'])
def create_classroom():
    """创建班级（仅老师可操作）"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        classroom_name = data.get('name')
        
        # 验证请求数据
        if not user_id or not classroom_name:
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 检查用户是否为老师角色
        if user.role != 'teacher':
            return jsonify({'success': False, 'message': '只有老师可以创建班级'}), 403
        
        # 生成唯一的班级代码
        classroom_code = Classroom.generate_unique_code()
        
        # 创建新班级
        new_classroom = Classroom(
            name=classroom_name,
            code=classroom_code,
            created_by=user_id
        )
        
        # 保存到数据库
        db.session.add(new_classroom)
        db.session.commit()
        
        # 老师自动加入班级
        user.classrooms.append(new_classroom)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '班级创建成功', 
            'classroom': new_classroom.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'创建班级失败: {str(e)}'}), 500

@classrooms_bp.route('/join', methods=['POST'])
def join_classroom():
    """学生通过代码加入班级"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        classroom_code = data.get('code')
        
        # 验证请求数据
        if not user_id or not classroom_code:
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 查找班级
        classroom = Classroom.query.filter_by(code=classroom_code).first()
        if not classroom:
            return jsonify({'success': False, 'message': '班级代码不存在'}), 404
        
        # 检查用户是否已经在班级中
        if classroom in user.classrooms:
            return jsonify({'success': False, 'message': '您已经在该班级中'}), 400
        
        # 将用户添加到班级
        user.classrooms.append(classroom)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '成功加入班级', 
            'classroom': classroom.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'加入班级失败: {str(e)}'}), 500

@classrooms_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_classrooms(user_id):
    """获取用户所在的所有班级"""
    try:
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 获取用户的班级列表
        classrooms = []
        for classroom in user.classrooms:
            classroom_data = classroom.to_dict()
            # 如果是老师，获取完整的班级信息（包含成员）
            if user.role == 'teacher' and user.id == classroom.created_by:
                classroom_data = classroom.to_dict_with_members()
            classrooms.append(classroom_data)
        
        return jsonify({
            'success': True, 
            'classrooms': classrooms
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取班级列表失败: {str(e)}'}), 500

@classrooms_bp.route('/<int:classroom_id>/members', methods=['GET'])
def get_classroom_members(classroom_id):
    """获取班级成员列表（仅老师可查看）"""
    try:
        data = request.args
        user_id = data.get('user_id')
        
        # 验证请求数据
        if not user_id:
            return jsonify({'success': False, 'message': '缺少用户ID'}), 400
        
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 查找班级
        classroom = Classroom.query.get(classroom_id)
        if not classroom:
            return jsonify({'success': False, 'message': '班级不存在'}), 404
        
        # 检查用户是否为班级创建者
        if user.id != classroom.created_by or user.role != 'teacher':
            return jsonify({'success': False, 'message': '只有老师可以查看班级成员'}), 403
        
        # 获取班级成员
        members = [{"id": member.id, "username": member.username, "role": member.role} for member in classroom.members]
        
        return jsonify({
            'success': True, 
            'members': members
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取班级成员失败: {str(e)}'}), 500

@classrooms_bp.route('/<int:classroom_id>', methods=['DELETE'])
def delete_classroom(classroom_id):
    """删除班级（仅创建者可操作）"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        # 验证请求数据
        if not user_id:
            return jsonify({'success': False, 'message': '缺少用户ID'}), 400
        
        # 查找用户
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 查找班级
        classroom = Classroom.query.get(classroom_id)
        if not classroom:
            return jsonify({'success': False, 'message': '班级不存在'}), 404
        
        # 检查用户是否为班级创建者
        if user.id != classroom.created_by:
            return jsonify({'success': False, 'message': '只有班级创建者可以删除班级'}), 403
        
        # 删除班级
        db.session.delete(classroom)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '班级删除成功'
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'删除班级失败: {str(e)}'}), 500