import { useState, useEffect } from 'react';
import axios from 'axios';
// ДОБАВИЛИ: Modal, Form
import { Container, Navbar, Nav, Card, Button, Row, Col, Table, Badge, Alert, Modal, Form } from 'react-bootstrap';

// --- КОМПОНЕНТ 1: КУРСЫ ---
function Courses() {
    const [courses, setCourses] = useState([]);

    // --- НОВОЕ: Состояние для модального окна создания курса ---
    const [showModal, setShowModal] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: '', description: '', price: '' });

    // Загрузка курсов
    const fetchCourses = () => {
        axios.get('http://localhost:8081/api/courses')
            .then(res => setCourses(res.data))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    // --- НОВОЕ: Функция отправки нового курса в БД ---
    const handleCreateCourse = () => {
        // Простая валидация
        if (!newCourse.title || !newCourse.price) {
            alert("Заполните название и цену!");
            return;
        }

        axios.post('http://localhost:8081/api/courses', newCourse)
            .then(() => {
                alert("✅ Курс успешно создан и сохранен в PostgreSQL!");
                setShowModal(false); // Закрываем окно
                setNewCourse({ title: '', description: '', price: '' }); // Очищаем форму
                fetchCourses(); // Обновляем список на экране
            })
            .catch(err => alert("Ошибка при сохранении: " + err.message));
    };

    // Функция записи (Enroll)
    const handleEnroll = (courseId) => {
        const userEmail = prompt("Введите email для записи:", "student@test.com");
        if (userEmail) {
            axios.post(`http://localhost:8081/api/courses/${courseId}/enroll?email=${userEmail}`)
                .then(() => alert("✅ Заявка отправлена!"))
                .catch(err => alert("❌ Ошибка: " + err.message));
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>🔥 Популярные курсы</h2>
                {/* НОВОЕ: Кнопка открытия окна */}
                <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
                    + Добавить курс
                </Button>
            </div>

            <Row>
                {courses.map(course => (
                    <Col key={course.id} lg={3} md={4} sm={6} xs={12} className="mb-4">
                        <Card className="h-100 shadow-sm course-card">
                            <div style={{ height: '120px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>
                                🎓
                            </div>
                            <Card.Body className="d-flex flex-column">
                                <Card.Title>{course.title}</Card.Title>
                                <Card.Text className="text-muted small flex-grow-1">
                                    {course.description}
                                </Card.Text>
                                <div className="mt-3 d-flex justify-content-between align-items-center">
                                    <h4 className="text-primary m-0">${course.price}</h4>
                                    <Button variant="outline-success" onClick={() => handleEnroll(course.id)}>
                                        Записаться
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {courses.length === 0 && (
                <Alert variant="light" className="text-center shadow-sm p-5">
                    <h4>Список пуст</h4>
                    <p>Нажми кнопку "Добавить курс", чтобы наполнить Базу Данных.</p>
                </Alert>
            )}

            {/* --- НОВОЕ: Модальное окно (Форма) --- */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Создание нового курса</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Название курса</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Например: Python для профи"
                                value={newCourse.title}
                                onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Описание</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="О чем этот курс?"
                                value={newCourse.description}
                                onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Цена ($)</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="100"
                                value={newCourse.price}
                                onChange={e => setNewCourse({...newCourse, price: e.target.value})}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Отмена</Button>
                    <Button variant="primary" onClick={handleCreateCourse}>Сохранить в БД</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

// --- КОМПОНЕНТ 2: УВЕДОМЛЕНИЯ ---
function Notifications() {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifs = () => {
            axios.get('http://localhost:8082/api/notifications')
                .then(res => setNotifications(res.data.reverse()))
                .catch(console.error);
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-white border-bottom-0 pt-4 px-4">
                <h3>📬 История отправленных писем</h3>
            </Card.Header>
            <Card.Body className="p-0">
                <Table hover responsive className="m-0">
                    <thead className="table-light">
                    <tr>
                        <th className="px-4">ID</th>
                        <th>Email</th>
                        <th>Сообщение</th>
                        <th>Дата</th>
                    </tr>
                    </thead>
                    <tbody>
                    {notifications.map(n => (
                        <tr key={n.id}>
                            <td className="px-4 text-muted">#{n.id}</td>
                            <td><span className="fw-bold text-dark">{n.recipientEmail}</span></td>
                            <td>{n.message}</td>
                            <td className="text-muted small">{n.sentAt ? new Date(n.sentAt).toLocaleString() : ''}</td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}

// --- APP ---
function App() {
    const [view, setView] = useState('courses');

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar bg="dark" variant="dark" expand="lg" className="py-3 shadow sticky-top">
                <Container>
                    <Navbar.Brand href="#">🎓 Education Platform</Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse>
                        <Nav className="ms-auto">
                            <Nav.Link active={view === 'courses'} onClick={() => setView('courses')} className="px-3">Курсы</Nav.Link>
                            <Nav.Link active={view === 'notifications'} onClick={() => setView('notifications')} className="px-3">Уведомления</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <Container className="py-5 flex-grow-1">
                {view === 'courses' ? <Courses /> : <Notifications />}
            </Container>

            <footer className="bg-white py-4 mt-auto border-top text-center text-muted">
                <Container><p className="mb-0">© 2025 Education Platform</p></Container>
            </footer>
        </div>
    );
}

export default App;