from datetime import datetime
from database import db

class Assignment(db.Model):
    """作业模型"""
    __tablename__ = 'assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    classroom_id = db.Column(db.Integer, db.ForeignKey('classrooms.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    word_level = db.Column(db.String(20), nullable=False)  # simple, medium, hard
    word_count = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='published')  # draft, published, completed
    
    # 关系
    classroom = db.relationship('Classroom', backref='assignments')
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_assignments')
    
    def to_dict(self):
        """将作业对象转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'classroom_id': self.classroom_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'word_level': self.word_level,
            'word_count': self.word_count,
            'status': self.status
        }

class StudentAssignment(db.Model):
    """学生作业关联模型"""
    __tablename__ = 'student_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    assignment_id = db.Column(db.Integer, db.ForeignKey('assignments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    assigned_words = db.Column(db.Text)  # JSON字符串，存储分配给该学生的单词
    completed = db.Column(db.Boolean, default=False)
    submitted_at = db.Column(db.DateTime)
    score = db.Column(db.Integer)  # 0-100的分数
    
    # 关系
    assignment = db.relationship('Assignment', backref='student_assignments')
    student = db.relationship('User', backref='received_assignments')
    
    def to_dict(self):
        """将学生作业对象转换为字典"""
        import json
        return {
            'id': self.id,
            'assignment_id': self.assignment_id,
            'student_id': self.student_id,
            'assigned_words': json.loads(self.assigned_words) if self.assigned_words else [],
            'completed': self.completed,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'score': self.score
        }
