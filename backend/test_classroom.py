from app import create_app, db
from models.user import User
from models.classroom import Classroom

# 创建应用实例
app = create_app()

with app.app_context():
    print("===== 测试班级管理功能 =====")
    
    # 创建一个测试老师用户
    print("\n1. 创建测试老师用户...")
    teacher = User.query.filter_by(username='test_teacher').first()
    if not teacher:
        teacher = User(username='test_teacher', email='teacher@test.com', role='teacher')
        teacher.set_password('password123')
        db.session.add(teacher)
        db.session.commit()
        print(f"   创建老师用户成功: ID={teacher.id}, 用户名={teacher.username}")
    else:
        print(f"   老师用户已存在: ID={teacher.id}, 用户名={teacher.username}")
    
    # 创建一个测试学生用户
    print("\n2. 创建测试学生用户...")
    student = User.query.filter_by(username='test_student').first()
    if not student:
        student = User(username='test_student', email='student@test.com', role='student')
        student.set_password('password123')
        db.session.add(student)
        db.session.commit()
        print(f"   创建学生用户成功: ID={student.id}, 用户名={student.username}")
    else:
        print(f"   学生用户已存在: ID={student.id}, 用户名={student.username}")
    
    # 测试创建班级
    print("\n3. 测试创建班级...")
    # 先删除可能存在的测试班级
    test_classroom = Classroom.query.filter_by(name='测试班级').first()
    if test_classroom:
        db.session.delete(test_classroom)
        db.session.commit()
        print("   删除已存在的测试班级")
    
    # 创建新的测试班级
    classroom_code = Classroom.generate_unique_code()
    new_classroom = Classroom(name='测试班级', code=classroom_code, created_by=teacher.id)
    db.session.add(new_classroom)
    db.session.commit()
    
    # 老师加入班级
    teacher.classrooms.append(new_classroom)
    db.session.commit()
    
    print(f"   创建班级成功: ID={new_classroom.id}, 名称={new_classroom.name}, 代码={new_classroom.code}")
    print(f"   班级创建者: {new_classroom.creator.username} (ID: {new_classroom.creator.id})")
    
    # 测试学生加入班级
    print("\n4. 测试学生加入班级...")
    student.classrooms.append(new_classroom)
    db.session.commit()
    print(f"   学生{student.username}成功加入班级")
    
    # 验证班级成员
    print("\n5. 验证班级成员...")
    classroom = Classroom.query.get(new_classroom.id)
    print(f"   班级成员数量: {classroom.members.count()}")
    for member in classroom.members:
        print(f"   - {member.username} (角色: {member.role})")
    
    # 测试to_dict_with_members方法
    print("\n6. 测试班级信息序列化...")
    classroom_dict = classroom.to_dict_with_members()
    print(f"   班级信息: {classroom_dict['name']} (代码: {classroom_dict['code']})")
    print(f"   序列化后的成员数量: {len(classroom_dict['members'])}")
    
    print("\n===== 测试完成 =====")