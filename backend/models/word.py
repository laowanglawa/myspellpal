from ..app import db

class Word(db.Model):
    """单词模型"""
    __tablename__ = 'words'
    
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False, unique=True)
    definition = db.Column(db.String(500), nullable=False)
    example = db.Column(db.String(1000), nullable=False)
    level = db.Column(db.String(20), nullable=False)  # simple, medium, hard
    pronunciation = db.Column(db.String(100))
    category = db.Column(db.String(50))
    
    # 关系
    user_progress = db.relationship('UserWordProgress', backref='word', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        """将单词对象转换为字典"""
        return {
            'id': self.id,
            'word': self.word,
            'definition': self.definition,
            'example': self.example,
            'level': self.level,
            'pronunciation': self.pronunciation,
            'category': self.category
        }
