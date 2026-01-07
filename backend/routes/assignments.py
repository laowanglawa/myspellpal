from flask import Blueprint, jsonify, request
import json
import random
from datetime import datetime
from database import db
from models.assignment import Assignment, StudentAssignment
from models.classroom import Classroom
from models.word import Word
from models.user import User

assignments_bp = Blueprint('assignments', __name__)

# 创建作业
@assignments_bp.route('/', methods=['POST'])
def create_assignment():
    """创建新作业"""
    try:
        data = request.get_json()
        
        # 验证必填字段
        required_fields = ['name', 'classroom_id', 'created_by', 'word_level', 'word_count']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'缺少必填字段: {field}'}), 400
        
        # 创建作业
        assignment = Assignment(
            name=data['name'],
            description=data.get('description'),
            classroom_id=data['classroom_id'],
            created_by=data['created_by'],
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            word_level=data['word_level'],
            word_count=data['word_count'],
            status=data.get('status', 'published')
        )
        
        db.session.add(assignment)
        db.session.commit()
        
        # 获取指定词库级别的所有单词
        words = Word.query.filter_by(level=data['word_level']).all()
        
        if len(words) < data['word_count']:
            return jsonify({'success': False, 'message': f'词库中只有 {len(words)} 个单词，不足以创建作业'}), 400
        
        # 获取班级中的所有学生
        classroom = Classroom.query.get(data['classroom_id'])
        if not classroom:
            return jsonify({'success': False, 'message': '班级不存在'}), 404
        
        # 为每个学生分配随机单词
        for student in classroom.members:
            # 随机选择指定数量的单词
            selected_words = random.sample(words, data['word_count'])
            # 将单词转换为字典并序列化为JSON
            assigned_words = json.dumps([word.to_dict() for word in selected_words])
            
            # 创建学生作业
            student_assignment = StudentAssignment(
                assignment_id=assignment.id,
                student_id=student.id,
                assigned_words=assigned_words
            )
            
            db.session.add(student_assignment)
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': '作业创建成功', 'assignment': assignment.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'创建作业失败: {str(e)}'}), 500

# 获取作业列表
@assignments_bp.route('/', methods=['GET'])
def get_assignments():
    """获取作业列表"""
    try:
        # 支持按班级筛选
        classroom_id = request.args.get('classroom_id')
        
        if classroom_id:
            assignments = Assignment.query.filter_by(classroom_id=classroom_id).all()
        else:
            assignments = Assignment.query.all()
        
        return jsonify({'success': True, 'assignments': [assignment.to_dict() for assignment in assignments]}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取作业列表失败: {str(e)}'}), 500

# 获取作业详情
@assignments_bp.route('/<int:assignment_id>', methods=['GET'])
def get_assignment(assignment_id):
    """获取作业详情"""
    try:
        assignment = Assignment.query.get(assignment_id)
        
        if not assignment:
            return jsonify({'success': False, 'message': '作业不存在'}), 404
        
        # 获取学生作业信息
        student_assignments = StudentAssignment.query.filter_by(assignment_id=assignment_id).all()
        
        return jsonify({
            'success': True,
            'assignment': assignment.to_dict(),
            'student_assignments': [sa.to_dict() for sa in student_assignments]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取作业详情失败: {str(e)}'}), 500

# 提交作业
@assignments_bp.route('/submit/<int:student_assignment_id>', methods=['POST'])
def submit_assignment(student_assignment_id):
    """提交作业"""
    try:
        data = request.get_json()
        
        # 获取学生作业
        student_assignment = StudentAssignment.query.get(student_assignment_id)
        
        if not student_assignment:
            return jsonify({'success': False, 'message': '学生作业不存在'}), 404
        
        # 更新作业状态
        student_assignment.completed = True
        student_assignment.submitted_at = datetime.utcnow()
        student_assignment.score = data.get('score')
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': '作业提交成功'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'提交作业失败: {str(e)}'}), 500

# 获取学生的作业
@assignments_bp.route('/student/<int:student_id>', methods=['GET'])
def get_student_assignments(student_id):
    """获取学生的作业列表"""
    try:
        student_assignments = StudentAssignment.query.filter_by(student_id=student_id).all()
        
        return jsonify({
            'success': True,
            'assignments': [sa.to_dict() for sa in student_assignments]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取学生作业失败: {str(e)}'}), 500
