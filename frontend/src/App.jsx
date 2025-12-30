import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Navbar, Nav, Card, Button, Row, Col, Table, Badge, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from "react-oidc-context";
// Импорт компонента документации (убедись, что файл существует)
import Documentation from './Documentation';

// --- ПОМОЩНИК: Достаем роли из токена ---
const getRolesFromToken = (user) => {
  if (!user || !user.access_token) return [];
  try {
    const base64Url = user.access_token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    return payload.realm_access?.roles || [];
  } catch (error) {
    console.error("Ошибка чтения токена", error);
    return [];
  }
};

// --- КОМПОНЕНТ 1: КУРСЫ ---
function Courses({ updateBalance }) {
  const auth = useAuth();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]); // Список ID купленных курсов
  const [showModal, setShowModal] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', price: '' });

  // Роли
  const userRoles = getRolesFromToken(auth.user);
  const isInstructor = userRoles.includes('INSTRUCTOR');

  // Загрузка всех курсов
  const fetchCourses = () => {
    axios.get('http://localhost:8081/api/courses')
      .then(res => setCourses(res.data))
      .catch(err => console.error(err));
  };

  // Загрузка "Моих курсов" (чтобы знать, где я уже записан)
  const fetchMyEnrollments = () => {
    if (auth.isAuthenticated && auth.user?.profile.email) {
      const email = auth.user.profile.email;
      const token = auth.user.access_token;
      
      axios.get(`http://localhost:8081/api/users/me?email=${email}`, {
          headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
          // Превращаем список объектов курсов в список ID
          const ids = res.data.courses.map(c => c.id);
          setMyCourses(ids);
      })
      .catch(console.error);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchMyEnrollments();
  }, [auth.isAuthenticated]);

  // СОЗДАНИЕ КУРСА (Только Инструктор)
  const handleCreateCourse = () => {
    if (!auth.isAuthenticated || !isInstructor) { 
      alert("У вас нет прав инструктора!");
      return;
    }

    const token = auth.user?.access_token;
    axios.post('http://localhost:8081/api/courses', newCourse, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        alert("✅ Курс создан!");
        setShowModal(false);
        setNewCourse({ title: '', description: '', price: '' });
        fetchCourses();
      })
      .catch(err => alert("Ошибка: " + err.message));
  };

  // ЗАПИСЬ НА КУРС
  const handleEnroll = (courseId) => {
    if (!auth.isAuthenticated) {
        auth.signinRedirect();
        return;
    }

    if(!confirm("Купить курс? Деньги спишутся с баланса.")) return;

    const userEmail = auth.user.profile.email;
    const token = auth.user.access_token;

    axios.post(`http://localhost:8081/api/courses/${courseId}/enroll?email=${userEmail}`, null, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
        alert("✅ Вы успешно записались!");
        fetchMyEnrollments(); // Обновляем состояние кнопок
        if (updateBalance) updateBalance(); // Обновляем баланс в шапке
    })
    .catch(err => {
        console.error(err);
        alert("Ошибка: " + (err.response?.data?.message || err.message));
    });
  };

  // ОТПИСКА (ВОЗВРАТ)
  const handleCancel = (courseId) => {
    if(!confirm("Вернуть курс? Деньги вернутся на счет.")) return;

    const userEmail = auth.user.profile.email;
    const token = auth.user.access_token;

    axios.post(`http://localhost:8081/api/courses/${courseId}/cancel?email=${userEmail}`, null, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
        alert("♻️ Курс возвращен, деньги зачислены.");
        fetchMyEnrollments();
        if (updateBalance) updateBalance();
    })
    .catch(err => alert("Ошибка: " + err.message));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>🔥 Популярные курсы</h2>
        {isInstructor && (
          <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
            + Добавить курс
          </Button>
        )}
      </div>

      <Row>
        {courses.map(course => {
          const isOwned = myCourses.includes(course.id);
          return (
            <Col key={course.id} lg={3} md={4} sm={6} xs={12} className="mb-4">
                <Card className="h-100 shadow-sm course-card">
                <div style={{ height: '120px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎓</div>
                <Card.Body className="d-flex flex-column">
                    <Card.Title>{course.title}</Card.Title>
                    <Card.Text className="text-muted small flex-grow-1">{course.description}</Card.Text>
                    <div className="mt-3 d-flex justify-content-between align-items-center">
                    <h4 className="text-primary m-0">${course.price}</h4>
                    
                    {/* УМНАЯ ЛОГИКА КНОПОК */}
                    {isOwned ? (
                        <Button variant="outline-danger" onClick={() => handleCancel(course.id)}>Вернуть</Button>
                    ) : (
                        <Button variant="success" onClick={() => handleEnroll(course.id)}>Купить</Button>
                    )}

                    </div>
                </Card.Body>
                </Card>
            </Col>
          );
        })}
      </Row>

      {/* Модалка создания */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Новый курс</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Название</Form.Label>
              <Form.Control type="text" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Описание</Form.Label>
              <Form.Control as="textarea" rows={3} value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Цена ($)</Form.Label>
              <Form.Control type="number" value={newCourse.price} onChange={e => setNewCourse({...newCourse, price: e.target.value})} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Отмена</Button>
          <Button variant="primary" onClick={handleCreateCourse}>Сохранить</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// --- КОМПОНЕНТ 2: УВЕДОМЛЕНИЯ ---
function Notifications() {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
     axios.get('http://localhost:8082/api/notifications').then(res => setNotifications(res.data.reverse())).catch(console.error);
  }, []);
  return (
    <Card className="shadow-sm border-0">
       <Card.Body>
         <h4>История уведомлений</h4>
         <Table striped bordered hover>
            <thead><tr><th>Email</th><th>Сообщение</th><th>Дата</th></tr></thead>
            <tbody>
                {notifications.map(n => (
                    <tr key={n.id}>
                        <td>{n.recipientEmail}</td>
                        <td>{n.message}</td>
                        <td className="text-muted small">{n.sentAt}</td>
                    </tr>
                ))}
            </tbody>
         </Table>
       </Card.Body>
    </Card>
  );
}

// --- APP (ГЛАВНЫЙ КОМПОНЕНТ) ---
function App() {
  const auth = useAuth();
  const [view, setView] = useState('courses');
  const [balance, setBalance] = useState(0);

  // Загружаем баланс
  const fetchBalance = () => {
    if (auth.isAuthenticated && auth.user?.profile.email) {
      const email = auth.user.profile.email;
      const token = auth.user.access_token;
      
      axios.get(`http://localhost:8081/api/users/me?email=${email}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setBalance(res.data.balance))
      .catch(err => console.error("Ошибка получения баланса", err));
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [auth.isAuthenticated]);

  // Пополнение баланса
  const handleTopUp = () => {
    const amountStr = prompt("Введите сумму пополнения ($):", "100");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      alert("Некорректная сумма!");
      return;
    }

    const email = auth.user.profile.email;
    const token = auth.user.access_token;

    axios.post(`http://localhost:8081/api/users/topup?email=${email}&amount=${amount}`, null, {
        headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
        alert(`✅ Баланс пополнен! Теперь у вас $${res.data}`);
        setBalance(res.data);
    })
    .catch(err => alert("Ошибка пополнения: " + err.message));
  };

  const userRoles = getRolesFromToken(auth.user);
  const roleName = userRoles.includes('INSTRUCTOR') ? 'Преподаватель' : (userRoles.includes('STUDENT') ? 'Студент' : 'Гость');

  if (auth.isLoading) return <div className="text-center mt-5">Загрузка...</div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar bg="dark" variant="dark" expand="lg" className="py-3 shadow sticky-top">
        <Container>
          <Navbar.Brand href="#">🎓 Education Platform</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link onClick={() => setView('courses')}>Курсы</Nav.Link>
              <Nav.Link onClick={() => setView('notifications')}>Уведомления</Nav.Link>
              <Nav.Link onClick={() => setView('docs')}>Документация</Nav.Link>
            </Nav>
            <Nav>
              {auth.isAuthenticated ? (
                <div className="d-flex align-items-center">
                  <div className="me-4 text-white d-flex align-items-center">
                    <span className="me-2">💰 ${balance}</span>
                    <Button variant="success" size="sm" style={{lineHeight: 1, padding: '2px 8px'}} onClick={handleTopUp} title="Пополнить">+</Button>
                  </div>
                  <span className="text-light me-2">{auth.user?.profile.preferred_username}</span>
                  <Badge bg="info" className="me-3">{roleName}</Badge>
                  <Button variant="outline-light" size="sm" onClick={() => auth.signoutRedirect()}>Выйти</Button>
                </div>
              ) : (
                <Button variant="primary" size="sm" onClick={() => auth.signinRedirect()}>Войти</Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-5 flex-grow-1">
        {view === 'courses' && <Courses updateBalance={fetchBalance} />}
        {view === 'notifications' && <Notifications />}
        {view === 'docs' && <Documentation />}
      </Container>
    </div>
  );
}

export default App;