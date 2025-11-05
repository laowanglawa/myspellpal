from flask import Blueprint, request, jsonify
from datetime import datetime
import random
from ..models.word import Word
from ..models.user import User
from ..models.user_word_progress import UserWordProgress
from ..app import db

# 创建蓝图
words_bp = Blueprint('words', __name__)

@words_bp.route('', methods=['GET'])
def get_words():
    """获取单词列表，支持分页和筛选"""
    try:
        # 获取查询参数
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        level = request.args.get('level')
        category = request.args.get('category')
        
        # 构建查询
        query = Word.query
        
        # 应用筛选条件
        if level:
            query = query.filter_by(level=level)
        if category:
            query = query.filter_by(category=category)
        
        # 执行分页查询
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # 构建响应数据
        words = [word.to_dict() for word in pagination.items]
        
        return jsonify({
            'success': True,
            'words': words,
            'total': pagination.total,
            'pages': pagination.pages,
            'page': pagination.page,
            'per_page': pagination.per_page
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取单词列表失败: {str(e)}'}), 500

@words_bp.route('/<int:word_id>', methods=['GET'])
def get_word(word_id):
    """获取单个单词详情"""
    try:
        word = Word.query.get_or_404(word_id)
        return jsonify({'success': True, 'word': word.to_dict()}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取单词详情失败: {str(e)}'}), 500

@words_bp.route('/random', methods=['GET'])
def get_random_word():
    """获取随机单词"""
    try:
        # 获取查询参数
        level = request.args.get('level')
        exclude_ids = request.args.getlist('exclude_ids', type=int)
        
        # 构建查询
        query = Word.query
        
        # 应用筛选条件
        if level:
            query = query.filter_by(level=level)
        
        # 排除指定ID的单词
        if exclude_ids:
            query = query.filter(~Word.id.in_(exclude_ids))
        
        # 获取所有符合条件的单词
        words = query.all()
        
        if not words:
            return jsonify({'success': False, 'message': '没有找到符合条件的单词'}), 404
        
        # 随机选择一个单词
        random_word = random.choice(words)
        
        return jsonify({'success': True, 'word': random_word.to_dict()}), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取随机单词失败: {str(e)}'}), 500

@words_bp.route('/practice', methods=['POST'])
def practice_word():
    """记录单词练习结果"""
    try:
        data = request.get_json()
        
        # 验证请求数据
        if not all(key in data for key in ['username', 'word_id', 'is_correct']):
            return jsonify({'success': False, 'message': '缺少必要字段'}), 400
        
        # 查找用户和单词
        user = User.query.filter_by(username=data['username']).first()
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        word = Word.query.get(data['word_id'])
        if not word:
            return jsonify({'success': False, 'message': '单词不存在'}), 404
        
        # 查找或创建进度记录
        progress = UserWordProgress.query.filter_by(
            user_id=user.id,
            word_id=word.id
        ).first()
        
        if not progress:
            progress = UserWordProgress(user_id=user.id, word_id=word.id)
            db.session.add(progress)
        
        # 更新进度记录
        if data['is_correct']:
            progress.correct_count += 1
        else:
            progress.incorrect_count += 1
        
        progress.last_practiced = datetime.utcnow()
        progress.update_mastery_level()
        
        # 保存到数据库
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': '练习记录已保存',
            'progress': progress.to_dict()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'保存练习记录失败: {str(e)}'}), 500

@words_bp.route('/stats/<username>', methods=['GET'])
def get_user_word_stats(username):
    """获取用户单词学习统计信息"""
    try:
        # 查找用户
        user = User.query.filter_by(username=username).first()
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        # 获取用户的所有单词进度
        progress_list = UserWordProgress.query.filter_by(user_id=user.id).all()
        
        # 计算统计信息
        total_words_practiced = len(progress_list)
        mastered_words = sum(1 for p in progress_list if p.is_mastered)
        
        # 计算总体正确率
        total_correct = sum(p.correct_count for p in progress_list)
        total_incorrect = sum(p.incorrect_count for p in progress_list)
        total_attempts = total_correct + total_incorrect
        
        accuracy = round((total_correct / total_attempts * 100), 2) if total_attempts > 0 else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'total_words_practiced': total_words_practiced,
                'mastered_words': mastered_words,
                'accuracy': accuracy,
                'total_attempts': total_attempts,
                'total_correct': total_correct,
                'total_incorrect': total_incorrect
            }
        }), 200
    
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取统计信息失败: {str(e)}'}), 500
