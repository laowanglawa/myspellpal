from datetime import datetime
from ..app import db

class UserWordProgress(db.Model):
    """用户单词学习进度模型"""
    __tablename__ = 'user_word_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    word_id = db.Column(db.Integer, db.ForeignKey('words.id'), nullable=False)
    correct_count = db.Column(db.Integer, default=0)
    incorrect_count = db.Column(db.Integer, default=0)
    last_practiced = db.Column(db.DateTime)
    is_mastered = db.Column(db.Boolean, default=False)
    mastery_level = db.Column(db.Integer, default=0)  # 0-100的掌握程度
    
    def calculate_accuracy(self):
        """计算正确率"""
        total = self.correct_count + self.incorrect_count
        if total == 0:
            return 0
        return round((self.correct_count / total) * 100, 2)
    
    def update_mastery_level(self):
        """更新掌握程度"""
        total = self.correct_count + self.incorrect_count
        if total == 0:
            self.mastery_level = 0
        else:
            # 基于正确率和总尝试次数计算掌握程度
            accuracy_factor = self.correct_count / total
            practice_factor = min(total / 10, 1)  # 最多10次练习就可以达到完全熟练度
            self.mastery_level = round(accuracy_factor * practice_factor * 100)
            
            # 如果掌握程度达到80%，标记为已掌握
            self.is_mastered = self.mastery_level >= 80
    
    def to_dict(self):
        """将进度对象转换为字典"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'word_id': self.word_id,
            'correct_count': self.correct_count,
            'incorrect_count': self.incorrect_count,
            'accuracy': self.calculate_accuracy(),
            'last_practiced': self.last_practiced.isoformat() if self.last_practiced else None,
            'is_mastered': self.is_mastered,
            'mastery_level': self.mastery_level
        }
