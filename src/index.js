/*
 * Copyright 2021 WPPConnect Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

require('dotenv').config();

import { createLogger } from './util/logger';
import { createFolders, setMaxListners, startAllSessions } from './util/functions';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server as Socket } from 'socket.io';
import routes from './routes';
import config from './config.json';
import boolParser from 'express-query-boolean';
import mergeDeep from 'merge-deep';
import { convert } from './mapper/index';
import { version } from '../package.json';

export function initServer(serverOptions) {
  if (typeof serverOptions !== 'object') {
    serverOptions = {};
  }

  serverOptions = mergeDeep({}, config, serverOptions);

  setMaxListners(serverOptions);

  const logger = createLogger(serverOptions.log);

  const app = express();
  const PORT = process.env.PORT || serverOptions.port;

  const http = new createServer(app);
  const io = new Socket(http, {
    cors: true,
    origins: ['*'],
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use('/files', express.static('WhatsAppImages'));
  app.use(boolParser());

  // Add request options
  app.use((req, res, next) => {
    req.serverOptions = serverOptions;
    req.logger = logger;
    req.io = io;

    var oldSend = res.send;

    res.send = async function (data) {
      const content = req.headers['content-type'];
      if (content == 'application/json') {
        data = JSON.parse(data);
        if (!data.session) data.session = req.client ? req.client.session : '';
        if (data.mapper && req.serverOptions.mapper.enable) {
          data.response = await convert(req.serverOptions.mapper.prefix, data.response, data.mapper);
          delete data.mapper;
        }
      }
      res.send = oldSend;
      return res.send(data);
    };
    next();
  });

  io.on('connection', (sock) => {
    logger.info(`ID: ${sock.id} entrou`);

    sock.on('disconnect', () => {
      logger.info(`ID: ${sock.id} saiu`);
    });
  });

  app.use(routes);

  createFolders();
  
   app.get('/', (req, res) => {
    var qrcode = ""

    var config = {
      method: 'post',
      url: 'https://whatsappapi.soucannabis.ong.br/api/nova/THISISMYSECURETOKEN/generate-token',
      headers: { 
        'Authorization': 'Bearer $2b$10$zp4uAGjLuOKRf7v7Nff5ROw436n.qeASrXLG5xtS3PRMo_XveNzQi'
      }
    };
    
    axios(config)
    
    var data = JSON.stringify({
        "webhook": null,
        "waitQrCode": false
      });
      
      var config = {
        method: 'post',
        url: 'https://whatsappapi.soucannabis.ong.br/api/nova/start-session',
        headers: { //
          'Content-Type': 'application/json', 
          'Authorization': 'Bearer $2b$10$zp4uAGjLuOKRf7v7Nff5ROw436n.qeASrXLG5xtS3PRMo_XveNzQi'
        },
        data : data
      };
      
      axios(config)
     
      var config = {
        method: 'get',
        url: 'https://whatsappapi.soucannabis.ong.br/api/nova/qrcode-session',
        headers: { 
          'Authorization': 'Bearer $2b$10$zp4uAGjLuOKRf7v7Nff5ROw436n.qeASrXLG5xtS3PRMo_XveNzQi'
        }
      }; 
      
      axios(config)
    
        res.send("<a href='https://railway.app/project/7632c611-58ff-403b-a896-b31c70f74dbd/service/b4349822-de56-4559-a15a-a9c943092457?id=4655a9cb-4fae-4a48-a0be-ecb076fd778b'>QR CODE</a>");
    });


  http.listen(PORT, () => {
    logger.info(`Server is running on port: ${PORT}`);
    logger.info(`\x1b[31m Visit ${serverOptions.host}:${PORT}/api-docs for Swagger docs`);
    logger.info(`WPPConnect-Server version: ${version}`);

    if (serverOptions.startAllSession) startAllSessions(serverOptions, logger);
  });

  return {
    app,
    routes,
    logger,
  };
}
