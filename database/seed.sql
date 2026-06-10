-- Seed data for PowerCode Academy

-- Admin and Student Users
INSERT INTO users (name, email, password_hash, role, learning_streak, is_verified) VALUES
('Super Admin', 'admin@powercode.com', '$2b$12$D39PWhpSTxX5N8tY3pD7H.F52UaREjIghF1F10Z0Eux8G0Y0mI37C', 'ADMIN', 12, true),
('Jane Doe', 'student@powercode.com', '$2b$12$D39PWhpSTxX5N8tY3pD7H.F52UaREjIghF1F10Z0Eux8G0Y0mI37C', 'STUDENT', 5, true);

-- Courses
INSERT INTO courses (title, description, thumbnail_url, price, is_premium) VALUES
('Complete JavaScript Zero to Hero', 'Master the world''s most popular programming language with projects, challenges, and quizzes.', 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=500', 0.00, false),
('Python Algorithms Masterclass', 'Dive deep into algorithms, data structures, and computer science concepts using Python.', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500', 0.00, false),
('Advanced Full-Stack Engineering with Prisma', 'Premium masterclass on Express, React, Node, and PostgreSQL schema designs.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500', 49.99, true);

-- Modules
INSERT INTO modules (course_id, title, sort_order) VALUES
(1, 'Course Introduction & Basics', 1),
(1, 'Variables & Control Flow', 2),
(2, 'Introduction to Big O & Recursion', 1),
(3, 'Database Modeling & Setup', 1);

-- Lessons
INSERT INTO lessons (module_id, title, content, video_url, duration_minutes, sort_order, is_preview_allowed) VALUES
(1, 'Welcome to Javascript 101', 'In this lesson, we will set up our developer environment, learn what JS is, and write our first console.log statement.', 'https://www.w3schools.com/html/mov_bbb.mp4', 12, 1, true),
(1, 'Executing Javascript in the Browser', 'Learn how the browser compiles and parses script tags, plus what the DOM represents.', 'https://www.w3schools.com/html/mov_bbb.mp4', 15, 2, false),
(2, 'Declaring variables: let, const, var', 'We cover scope, hoisting, and assignment expressions in details.', 'https://www.w3schools.com/html/mov_bbb.mp4', 20, 1, false),
(3, 'What is Big O Notation?', 'Analyze the speed, memory consumption, and complexity bounds of algorithms.', 'https://www.w3schools.com/html/mov_bbb.mp4', 18, 1, true);

-- Tutorials
INSERT INTO tutorials (title, category, content, code_snippet, language_slug) VALUES
('Getting Started with React Hooks', 'React', 'React Hooks let you use state and other React features without writing a class. The most popular hooks are useState and useEffect.', 'import React, { useState } from "react";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;\n}', 'javascript'),
('Working with SQLite in Node.js', 'PostgreSQL', 'SQLite is a SQL database engine. In Node, you can use the sqlite3 or bettersqlite3 packages to query schemas.', 'const Database = require("better-sqlite3");\nconst db = new Database("app.db");\nconst row = db.prepare("SELECT * FROM users WHERE id = ?").get(1);\nconsole.log(row.name);', 'javascript'),
('Binary Search Tree Implementation', 'Python', 'A binary search tree is a node-based binary tree data structure where each node has at most two children.', 'class Node:\n    def __init__(self, key):\n        self.left = None\n        self.right = None\n        self.val = key', 'python');

-- PDF Library Books
INSERT INTO pdfs (title, author, category, file_url, preview_url, is_premium) VALUES
('Eloquent JavaScript (3rd Edition)', 'Marijn Haverbeke', 'JavaScript', 'https://eloquentjavascript.net/Eloquent_JavaScript.pdf', 'https://eloquentjavascript.net/00_intro.html', false),
('Python for Data Analysis', 'Wes McKinney', 'Python', 'https://wesmckinney.com/book/', 'https://wesmckinney.com/book/', true),
('Designing Data-Intensive Applications', 'Martin Kleppmann', 'SQL', 'https://learning.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/', 'https://learning.oreilly.com/library/view/designing-data-intensive-applications/', true);

-- Quizzes
INSERT INTO quizzes (course_id, title, duration_minutes, passing_score) VALUES
(1, 'Variables and Types Quiz', 10, 80);

-- Quiz Questions
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer) VALUES
(1, 'Which variable declaration can be reassigned?', ARRAY['const', 'let', 'static', 'internal'], 'let'),
(1, 'What is the value of typeof null?', ARRAY['"object"', '"null"', '"undefined"', '"string"'], '"object"');

-- Coding Challenges
INSERT INTO challenges (title, description, difficulty, starter_code, solution_code, test_cases, points, category) VALUES
('Two Sum Solver', 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\n### Example:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]', 'EASY', 'function twoSum(nums, target) {\n  // Write your code here\n  return [];\n}', 'function twoSum(nums, target) {\n  const map = new Map();\n  for(let i=0; i<nums.length; i++) {\n    const compl = target - nums[i];\n    if(map.has(compl)) return [map.get(compl), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}', '[{"input": "[[2,7,11,15], 9]", "output": "[0,1]"}, {"input": "[[3,2,4], 6]", "output": "[1,2]"}]'::jsonb, 10, 'Algorithms'),
('Reverse a String', 'Write a function that reverses a string input in-place without using extra space.', 'EASY', 'function reverseString(s) {\n  // Write your code here\n  return "";\n}', 'function reverseString(s) {\n  return s.split("").reverse().join("");\n}', '[{"input": "\\"hello\\"", "output": "\\"olleh\\""}, {"input": "\\"abc\\"", "output": "\\"cba\\""}]'::jsonb, 10, 'Strings');
