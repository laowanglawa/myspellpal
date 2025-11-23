from datetime import datetime
import random
import string
from ..app import db

class Classroom(db.Model):
    """班级模型"""
    __tablename__ = 'classrooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    creator = db.relationship('User', foreign_keys=[created_by], backref='created_classrooms')
    
    @staticmethod
    def generate_unique_code():
        """生成唯一的班级代码"""
        while True:
            # 生成8位随机字符作为班级代码
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            # 检查代码是否已存在
            if not Classroom.query.filter_by(code=code).first():
                return code
    
    def to_dict(self):
        """将班级对象转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def to_dict_with_members(self):
        """将班级对象转换为字典，包含成员信息"""
        data = self.to_dict()
        data['members'] = [{
            'id': member.id,
            'username': member.username,
            'role': member.role
        } for member in self.members]
        return data