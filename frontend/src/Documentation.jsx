import React from 'react';
import { Container, Card, Badge, Accordion } from 'react-bootstrap';
import Mermaid from './components/Mermaid'; // Убедись, что Mermaid.jsx лежит в папке components

function Documentation() {
  const archDiagram = `
    graph TD
      User((Student/Teacher)) -->|HTTPS| Frontend[React Frontend :5173]
      
      subgraph Infrastructure [Docker Infrastructure]
        Frontend -->|REST API + JWT Token| CourseSvc[Course Service :8081]
        Frontend -->|REST API| NotifSvc[Notification Service :8082]
        Frontend -.->|Login/Register| Keycloak[Keycloak :8180]
        
        CourseSvc -->|CRUD| PostgresDB[(PostgreSQL)]
        CourseSvc -->|Publish 'Enrollment'| Kafka{Apache Kafka}
        
        Kafka -->|Consume 'Enrollment'| NotifSvc
        NotifSvc -->|Log History| H2[(H2 In-Memory DB)]
      end
      
      style User fill:#cde4ff
  `;

  const dbDiagram = `
    erDiagram
      USERS ||--o{ USERS_COURSES : "покупает"
      COURSES ||--o{ USERS_COURSES : "куплен"
      COURSES ||--o{ WEEKS : "содержит"
      WEEKS ||--o{ LESSONS : "содержит"

      USERS {
        long id PK "ID"
        string email "Email (unique)"
        decimal balance "Баланс ($)"
      }
      COURSES {
        long id PK "ID"
        string title "Название"
        decimal price "Цена"
      }
      USERS_COURSES {
        long user_id FK "ID юзера"
        long courses_id FK "ID курса"
      }
      WEEKS {
        long id PK "ID"
        int week_number "Номер недели"
      }
      LESSONS {
        long id PK "ID"
        string type "Тип (VIDEO, TASK)"
      }
  `;

  const seqDiagram = `
    sequenceDiagram
      actor S as Student
      participant F as Frontend
      participant K as Keycloak
      participant C as CourseService
      participant D as Postgres
      participant Q as Kafka
      
      S->>F: Клик "Купить"
      F->>K: Проверка авторизации
      K-->>F: OK, JWT токен валиден
      F->>C: POST /enroll (с токеном)
      
      activate C
      C->>D: Найти User по email
      alt Пользователя нет в нашей БД
        C->>D: INSERT INTO users (создать с бонусом)
      end
      
      C->>D: UPDATE users SET balance = balance - price
      C->>D: INSERT INTO users_courses (сохранить покупку)
      Note over C, D: Все в одной транзакции!
      
      C->>Q: Отправить событие "EnrollmentEvent"
      C-->>F: 200 OK (Успех)
      deactivate C
  `;

  return (
    <Container className="py-5">
      <h1 className="mb-4">Техническая документация проекта</h1>
      <p className="lead">
        Этот проект — полуфункциональный прототип образовательной платформы, построенный на микросервисной архитектуре. 
        Цель — продемонстрировать взаимодействие независимых сервисов, асинхронную обработку событий и интеграцию с системой безопасности.
      </p>

      <div className="mb-4">
        <h4>Ключевые технологии:</h4>
        <Badge bg="primary" className="me-2 p-2">Java 21 + Spring Boot 3</Badge>
        <Badge bg="info" className="me-2 p-2">React + Vite</Badge>
        <Badge bg="warning" className="me-2 p-2" text="dark">Kafka</Badge>
        <Badge bg="secondary" className="me-2 p-2">PostgreSQL</Badge>
        <Badge bg="danger" className="me-2 p-2">Keycloak</Badge>
        <Badge bg="dark" className="me-2 p-2">Docker</Badge>
      </div>

      <Accordion defaultActiveKey="0" className="shadow-sm">
        <Accordion.Item eventKey="0">
          <Accordion.Header>🏛️ Архитектура системы</Accordion.Header>
          <Accordion.Body>
            <p>Мы выбрали микросервисный подход, чтобы разделить бизнес-логику. <strong>Course Service</strong> — это "мозг" системы, отвечающий за курсы и финансы. <strong>Notification Service</strong> — простой фоновый воркер, который реагирует на события.</p>
            <p>Такое разделение позволяет независимо масштабировать и обновлять сервисы. Для связи между ними мы используем брокер сообщений <strong>Kafka</strong>, что гарантирует доставку уведомлений, даже если сервис уведомлений временно недоступен (слабая связность).</p>
            <Card className="p-3 border-0 bg-light"><Mermaid chart={archDiagram} /></Card>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="1">
          <Accordion.Header>💾 Схема основной Базы Данных</Accordion.Header>
          <Accordion.Body>
            <p>Для хранения данных о курсах и пользователях мы используем PostgreSQL. Схема спроектирована так, чтобы четко разделять сущности. Ключевым элементом является связующая таблица <code>USERS_COURSES</code>, которая реализует связь "многие-ко-многим" и хранит информацию о покупках.</p>
            <p>Управление версиями схемы БД осуществляется с помощью <strong>Flyway</strong>, что позволяет безболезненно накатывать изменения.</p>
            <Card className="p-3 border-0 bg-light"><Mermaid chart={dbDiagram} /></Card>
          </Accordion.Body>
        </Accordion.Item>

        <Accordion.Item eventKey="2">
          <Accordion.Header>🔄 Диаграмма процесса покупки</Accordion.Header>
          <Accordion.Body>
            <p>Этот процесс — самый важный в системе. Он демонстрирует, как взаимодействуют все компоненты:</p>
            <ol>
              <li>Фронтенд проверяет, что у пользователя есть валидный JWT токен от Keycloak.</li>
              <li>Запрос на покупку отправляется в Course Service. Все операции с базой (проверка баланса, списание, запись о покупке) выполняются в рамках одной <strong>транзакции</strong>. Если что-то пойдет не так, все изменения откатятся.</li>
              <li>Только после успешной транзакции в Kafka отправляется событие <code>EnrollmentEvent</code>. Это гарантирует, что уведомление уйдет только о реально состоявшейся покупке.</li>
            </ol>
            <Card className="p-3 border-0 bg-light"><Mermaid chart={seqDiagram} /></Card>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
      
      <div className="mt-5 text-center">
        <h4>Как запустить проект?</h4>
        <p>1. Убедитесь, что Docker запущен.</p>
        <p>2. В корневой папке выполните: <code>docker compose up -d</code></p>
        <p>3. Запустите оба Java-сервиса в IntelliJ IDEA.</p>
        <p>4. В папке <code>frontend</code> выполните: <code>npm install && npm run dev</code></p>
      </div>
    </Container>
  );
}

export default Documentation;