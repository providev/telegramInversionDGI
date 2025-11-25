import React, { useState, useEffect, useRef } from 'react';
import { Layout, Typography, Card, Form, Input, Button, DatePicker, Select, message, Table, Space, Steps, ConfigProvider, Row, Col, Grid, Popconfirm, Spin, Modal, theme } from 'antd';
import { DownloadOutlined, ReloadOutlined, DeleteOutlined, BulbOutlined, CopyOutlined, RobotOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import esES from 'antd/locale/es_ES';
import { io } from 'socket.io-client';
import geminiIcon from './assets/gemini.png';
import chatgptIcon from './assets/chatgpt.png';

dayjs.locale('es');

const { useBreakpoint } = Grid;

const { Header, Content, Footer } = Layout;
const { Title } = Typography;
const { Option } = Select;

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

const GeminiIcon = (props) => (
  <span role="img" aria-label="gemini" className="anticon" {...props}>
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <path d="M13.85 22.25C13.22 14.43 2.8 13.85 2.8 13.85C2.8 13.85 13.22 13.24 13.85 5.43C14.48 13.24 24.9 13.85 24.9 13.85C24.9 13.85 14.48 14.43 13.85 22.25ZM10.35 13.85C10.35 16.53 11.41 18.66 13.85 20.09C16.29 18.66 17.35 16.53 17.35 13.85C17.35 11.17 16.29 9.04 13.85 7.61C11.41 9.04 10.35 11.17 10.35 13.85Z" />
      <path d="M7.35 11.25C6.92 6.43 0.8 6.05 0.8 6.05C0.8 6.05 6.92 5.64 7.35 0.83C7.78 5.64 13.9 6.05 13.9 6.05C13.9 6.05 7.78 6.43 7.35 11.25ZM5.35 6.05C5.35 7.53 5.91 8.66 7.35 9.49C8.79 8.66 9.35 7.53 9.35 6.05C9.35 4.57 8.79 3.44 7.35 2.61C5.91 3.44 5.35 4.57 5.35 6.05Z" />
    </svg>
  </span>
);

function App() {
  const screens = useBreakpoint();
  const [status, setStatus] = useState({ authorized: false });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateWarning, setDateWarning] = useState(null);

  // Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [password, setPassword] = useState('');

  const logsContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    checkStatus();
    fetchFiles();
    const interval = setInterval(fetchFiles, 10000);

    const socket = io(SOCKET_URL);
    socket.on('log', (msg) => {
      setLogs((prev) => [...prev, msg]);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  // Smart Auto-scroll
  useEffect(() => {
    if (shouldAutoScrollRef.current && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current;
      // If user is near the bottom (within 20px), enable auto-scroll
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      shouldAutoScrollRef.current = isAtBottom;
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`);
      const data = await res.json();
      setStatus(data);
      if (data.authorized) setCurrentStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/files`);
      const data = await res.json();
      // Sort by date descending
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendCode = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      message.success('¡Código enviado!');
      setCurrentStep(1);
    } catch (err) {
      message.error('Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneCode }),
      });
      const data = await res.json();
      if (data.success) {
        message.success('¡Sesión iniciada!');
        checkStatus();
      } else if (data.error === 'PASSWORD_NEEDED') {
        setCurrentStep(2);
      }
    } catch (err) {
      message.error('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async () => {
    setLoading(true);
    try {
      await fetch(`${API_URL}/auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      message.success('¡Sesión iniciada!');
      checkStatus();
    } catch (err) {
      message.error('Contraseña incorrecta');
    } finally {
      setLoading(false);
    }
  };

  const onFinishExtraction = async (values) => {
    setLoading(true);
    setLogs([]); // Clear logs on new run
    shouldAutoScrollRef.current = true; // Reset auto-scroll
    try {
      const payload = {
        subchannel: values.subchannel,
        startDate: values.startDate.format('DD/MM/YYYY'),
        endDate: values.endDate ? values.endDate.format('DD/MM/YYYY') : null,
      };

      const res = await fetch(`${API_URL}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      message.success(`¡Extracción completada! ${result.count} mensajes guardados.`);
      fetchFiles();
    } catch (err) {
      message.error('Error en la extracción');
    } finally {
      setLoading(false);
    }
  };

  const parseFilename = (filename) => {
    // Expected format: SUBCHANNEL_STARTDATE_ENDDATE.json
    // Example: INVERSION_DGI_2025-11-17_2025-11-25.json
    const regex = /^(.*)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\.json$/;
    const match = filename.match(regex);
    if (match) {
      return {
        subchannel: match[1],
        startDate: match[2],
        endDate: match[3]
      };
    }
    return { subchannel: filename, startDate: '-', endDate: '-' };
  };

  const handleDelete = async (filename) => {
    try {
      const res = await fetch(`${API_URL}/files/${filename}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        message.success('Archivo eliminado');
        fetchFiles();
      } else {
        message.error('Error al eliminar el archivo');
      }
    } catch (err) {
      message.error('Error al eliminar el archivo');
    }
  };

  const promptExample = `Elabora un resumen ejecutivo completo sobre la actividad del canal de inversión, basándote en la información contenida en el archivo JSON adjunto y el periodo de sus mensajes. Tu resumen debe incluir:

1. Debates estratégicos
   - Identifica los principales debates sobre estrategias de inversión.
   - Expón las diferentes posturas que surgieron en cada debate.

2. Empresas con debates relevantes
   - Lista las empresas que protagonizaron grandes debates relacionados con su modelo de negocio, resultados, riesgos, perspectivas u otros datos importantes.
   - Indica si se alcanzó alguna conclusión, consenso o tendencia dominante.

3. Empresas con debates menores
   - Enumera las compañías que tuvieron discusiones breves, superficiales o con poca participación.

4. Resultados empresariales y noticias de la semana
   - Resume todos los resultados financieros, actualizaciones y noticias relevantes de empresas mencionadas durante la semana.

5. Noticias macro y del sector inversor
   - Incluye las principales noticias sobre economía, mercados globales, política monetaria o inversores conocidos que no se hayan mencionado en apartados anteriores.

6. Actividad de compra/venta del canal
   - Enumera las empresas más compradas y las más vendidas durante la semana.

7. Análisis de sentimiento del canal
   - Describe el sentimiento general (positivo, negativo, mixto, eufórico, temeroso, etc.).
   - Explica cómo evolucionó a lo largo de la semana.

8. Usuarios destacados
   - Identifica a los usuarios con mayor actividad o contribuciones relevantes.

9. Saludos personalizados
   - Realiza un saludo o mención especial a los usuarios que hayan hecho referencia a Gemini o al propio resumen semanal.

Asegúrate de que el resumen sea claro, estructurado y conciso, orientado a que un usuario que no haya podido estar al día del canal pueda saber a alto nivel qué se ha estado hablando.`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptExample);
    message.success('¡Prompt copiado al portapapeles!');
  };

  const columns = [
    {
      title: 'Subcanal',
      key: 'subchannel',
      ellipsis: true,
      render: (_, record) => parseFilename(record.name).subchannel,
    },
    {
      title: 'Fecha Inicio',
      key: 'startDate',
      width: 110,
      render: (_, record) => parseFilename(record.name).startDate,
    },
    {
      title: 'Fecha Fin',
      key: 'endDate',
      width: 110,
      render: (_, record) => parseFilename(record.name).endDate,
    },
    {
      title: 'Tamaño',
      dataIndex: 'size',
      key: 'size',
      width: 90,
      responsive: ['sm'],
      render: (size) => `${(size / 1024).toFixed(2)} KB`,
    },
    {
      title: 'Acción',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            href={`${API_URL}/files/${record.name}`}
            target="_blank"
          />
          <Popconfirm
            title="¿Estás seguro de que quieres eliminar este archivo?"
            onConfirm={() => handleDelete(record.name)}
            okText="Sí"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ConfigProvider locale={esES} theme={{ algorithm: theme.defaultAlgorithm }}>
      <Layout style={{ height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden' }}>
        <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <Title level={4} style={{ color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Telegram Extractor</Title>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <a href="https://t.me/DGIDividendosCrecientes" target="_blank" rel="noopener noreferrer" style={{ color: '#bae7ff', fontWeight: '500' }}>
              DGI (Dividendos Crecientes)
            </a>
            <Button
              type="text"
              icon={<img src={geminiIcon} alt="Gemini" style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'white', padding: '2px' }} />}
              onClick={() => setIsModalOpen(true)}
              title="Ver Ejemplo de Prompt"
            />
          </div>
        </Header>

        <Content style={{
            padding: '16px',
            height: 'calc(100vh - 64px)',
            // Desktop: hidden (no page scroll), Mobile: auto (page scroll)
            overflowY: screens.lg ? 'hidden' : 'auto',
            overflowX: 'hidden'
        }}>

            {initialLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Spin size="large" />
              </div>
            ) : !status.authorized ? (
              <Card title="Requiere Autenticación" style={{ maxWidth: 600, margin: 'auto', marginTop: 50 }}>
                <Steps current={currentStep} style={{ marginBottom: 24 }}>
                  <Steps.Step title="Teléfono" />
                  <Steps.Step title="Código" />
                  <Steps.Step title="Contraseña" />
                </Steps>

                {currentStep === 0 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      placeholder="Número de Teléfono (+34...)"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                    />
                    <Button type="primary" onClick={handleSendCode} loading={loading} block>Enviar Código</Button>
                  </Space>
                )}

                {currentStep === 1 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      placeholder="Introduce el Código"
                      value={phoneCode}
                      onChange={e => setPhoneCode(e.target.value)}
                    />
                    <Button type="primary" onClick={handleSignIn} loading={loading} block>Verificar Código</Button>
                  </Space>
                )}

                {currentStep === 2 && (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input.Password
                      placeholder="Contraseña 2FA"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <Button type="primary" onClick={handlePassword} loading={loading} block>Enviar Contraseña</Button>
                  </Space>
                )}
              </Card>
            ) : (
              <Row gutter={[16, 16]} style={{
                  height: screens.lg ? '100%' : 'auto', // Desktop: fill height, Mobile: auto
                  margin: 0
              }}>
                {/* Left Column: Controls & Files */}
                <Col xs={24} lg={12} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: screens.lg ? '100%' : 'auto',
                    padding: 0
                }}>
                  <Space direction="vertical" size="middle" style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>

                    <Card title="Iniciar Extracción">
                      <Form layout="vertical" onFinish={onFinishExtraction}>
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item name="subchannel" label="Subcanal" rules={[{ required: true, message: 'Por favor selecciona un subcanal' }]}>
                              <Select placeholder="Selecciona Subcanal" style={{ width: '100%' }}>
                                <Option value="INVERSION_DGI">INVERSION_DGI</Option>
                                <Option value="RINCON_DE_PENSAR">RINCON_DE_PENSAR</Option>
                                <Option value="ANALISIS_TECNICO">ANALISIS_TECNICO</Option>
                                <Option value="OPCIONES">OPCIONES</Option>
                                <Option value="BROKERS_Y_APPS">BROKERS_Y_APPS</Option>
                                <Option value="OTRAS_ESTRATEGIAS">OTRAS_ESTRATEGIAS</Option>
                                <Option value="FONTOS_Y_ETFS">FONTOS_Y_ETFS</Option>
                                <Option value="CLUB_LECTURA">CLUB_LECTURA</Option>
                                <Option value="NOTICIAS_ANUNCIOS_DGI">NOTICIAS_ANUNCIOS_DGI</Option>
                                <Option value="FISCALIDAD_INVERSION">FISCALIDAD_INVERSION</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="startDate" label="Fecha Inicio" rules={[{ required: true, message: 'Selecciona fecha inicio' }]}>
                              <DatePicker
                                format="DD/MM/YYYY"
                                style={{ width: '100%' }}
                                placeholder="Seleccionar"
                                placement="bottomLeft"
                                inputReadOnly={true}
                                onChange={(date) => {
                                  if (date && date.isBefore(dayjs().subtract(1, 'month'))) {
                                    setDateWarning('Seleccionar una fecha de hace más de 1 mes puede hacer que la extracción tarde mucho o falle.');
                                  } else {
                                    setDateWarning(null);
                                  }
                                }}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item name="endDate" label="Fecha Fin">
                              <DatePicker
                                format="DD/MM/YYYY"
                                style={{ width: '100%' }}
                                placeholder="Seleccionar"
                                placement="bottomRight"
                                inputReadOnly={true}
                              />
                            </Form.Item>
                          </Col>
                          {dateWarning && (
                            <Col span={24}>
                              <div style={{ color: '#faad14', marginBottom: '10px', fontSize: '12px' }}>
                                ⚠️ {dateWarning}
                              </div>
                            </Col>
                          )}
                        </Row>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                          Comenzar Extracción
                        </Button>
                      </Form>
                    </Card>

                    <Card
                      title="Archivos Generados"
                      extra={
                        <Button icon={<ReloadOutlined />} onClick={fetchFiles}>Actualizar</Button>
                      }
                      style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                      bodyStyle={{ flex: 1, overflow: 'auto', padding: 0 }}
                    >
                      <Table
                        dataSource={files}
                        columns={columns}
                        rowKey="name"
                        pagination={{ pageSize: 5 }}
                        scroll={{ y: screens.lg ? 'calc(100vh - 450px)' : 300, x: true }}
                        size="small"
                        locale={{ emptyText: 'No hay archivos' }}
                      />
                    </Card>
                  </Space>
                </Col>

                {/* Right Column: Logs */}
                <Col xs={24} lg={12} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: screens.lg ? '100%' : 'auto',
                    padding: 0
                }}>
                  <Card
                    title="Logs de Extracción"
                    style={{
                        flex: screens.lg ? 1 : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        height: screens.lg ? '100%' : '250px',
                        maxHeight: screens.lg ? 'none' : '250px',
                        width: '100%',
                        marginTop: screens.lg ? 0 : '16px'
                    }}
                    bodyStyle={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
                  >
                    <div
                      ref={logsContainerRef}
                      onScroll={handleScroll}
                      style={{
                        backgroundColor: '#1e1e1e',
                        color: '#00ff00',
                        fontFamily: 'monospace',
                        padding: '12px',
                        flex: 1,
                        overflowY: 'auto',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {logs.length === 0 ? (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>Esperando logs...</div>
                      ) : (
                        logs.map((log, index) => (
                          <div key={index} style={{ borderBottom: '1px solid #333', paddingBottom: '2px', marginBottom: '2px' }}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>
            )}
        </Content>
        <Modal
          title="Ejemplo de Prompt para IA"
          open={isModalOpen}
          onOk={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="copy" icon={<CopyOutlined />} onClick={copyToClipboard}>
              Copiar Prompt
            </Button>,
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Cerrar
            </Button>,
          ]}
        >
          <p>Copia este prompt y úsalo con tu IA favorita (Gemini, ChatGPT...) adjuntando el archivo JSON generado.</p>
          <Input.TextArea
            value={promptExample}
            autoSize={{ minRows: 10, maxRows: 15 }}
            readOnly
            style={{ marginTop: 10, fontFamily: 'monospace', fontSize: '12px' }}
          />
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: '15px' }}>
             <Button size="large" href="https://gemini.google.com/app" target="_blank" icon={<img src={geminiIcon} alt="Gemini" width={24} />}>Gemini</Button>
             <Button size="large" href="https://chatgpt.com/" target="_blank" icon={<img src={chatgptIcon} alt="ChatGPT" width={24} />}>ChatGPT</Button>
          </div>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
