from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# 初始化数据库实例
db = SQLAlchemy()

def create_app():
    """创建和配置Flask应用实例"""
    app = Flask(__name__)
    
    # 配置应用
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///words.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # 初始化数据库
    db.init_app(app)
    
    # 配置CORS，允许前端访问
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # 导入和注册蓝图
    from routes.auth import auth_bp
    from routes.words import words_bp
    from routes.user import user_bp
    
    app.register_blueprint(auth_bp, url_prefix=f"{os.environ.get('API_PREFIX', '/api/v1')}/auth")
    app.register_blueprint(words_bp, url_prefix=f"{os.environ.get('API_PREFIX', '/api/v1')}/words")
    app.register_blueprint(user_bp, url_prefix=f"{os.environ.get('API_PREFIX', '/api/v1')}/user")
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
        # 初始化一些示例单词数据
        from models.word import Word
        if Word.query.count() == 0:
            # 添加一些示例单词
            sample_words = [
                {"word": "apple", "definition": "苹果", "example": "I eat an apple every day.", "level": "simple"},
                {"word": "book", "definition": "书", "example": "This book is very interesting.", "level": "simple"},
                {"word": "computer", "definition": "电脑", "example": "I use my computer to work.", "level": "simple"},
                {"word": "beautiful", "definition": "美丽的", "example": "She is a beautiful girl.", "level": "simple"},
                {"word": "important", "definition": "重要的", "example": "This is an important meeting.", "level": "simple"},
                {"word": "accomplish", "definition": "完成", "example": "She accomplished her goal.", "level": "medium"},
                {"word": "approximately", "definition": "大约", "example": "It will take approximately two hours.", "level": "medium"},
                {"word": "circumstance", "definition": "情况", "example": "Under the circumstances, we have to leave.", "level": "medium"},
                {"word": "demonstration", "definition": "示范", "example": "The teacher gave a demonstration.", "level": "medium"},
                {"word": "establishment", "definition": "建立", "example": "The establishment of the new company took time.", "level": "medium"},
                {"word": "ambiguous", "definition": "模糊的", "example": "His answer was ambiguous.", "level": "hard"},
                {"word": "conscientious", "definition": "认真的", "example": "She is a conscientious worker.", "level": "hard"},
                {"word": "ephemeral", "definition": "短暂的", "example": "Fame in Hollywood is often ephemeral.", "level": "hard"},
                {"word": "idiosyncratic", "definition": "特殊的", "example": "He has idiosyncratic habits.", "level": "hard"},
                {"word": "perennial", "definition": "多年生的", "example": "Roses are perennial flowers.", "level": "hard"},
            ]
            
            for word_data in sample_words:
                word = Word(**word_data)
                db.session.add(word)
            
            db.session.commit()
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=os.environ.get('DEBUG', 'True').lower() == 'true', host='0.0.0.0', port=5000)
