const express  = require('express');
const MailMap  = require('../api/mail_map');
const Methods  = require('../api/methods');
const Mailer   = require('../api/mailer');
const Utils    = require('./utilities');
const validate = require('./validate').validate;
const schemas  = require('./schemas');
const router   = express.Router();

// /mail_maps
router.route('/mail_maps')
  .post((req, res) => {
    Methods.insert(req.body.email, req.body.inboundAddress)
      .then((inboundAddress) => res.json({ inboundAddress }))
      .catch(res.send);
  })

  .get((req, res) => {
    const query = {};
    const email = req.body.email;

    validate(res, schemas.EMAIL, email);
    if (email) query.forwardingAddress = email;

    return MailMap.find(query)
      .then((mailMaps) => res.json(mailMaps))
      .catch((err) => res.send(err));
  });

// /mail_maps/:id
router.route('/mail_maps/:id')

  .get((req, res) => {
    validate(res, schemas.STRING, req.params.id);

    MailMap.findOne({ _id: req.params.id })
      .then((mailMap) => res.json(mailMap))
      .catch((err) => res.send(err));
  })

  .put((req, res) => {
    validate(res, schemas.STRING, req.params.id);
    validate(res, schemas.EMAIL, req.body.email);

    Methods.update(req.params.id, req.body.email)
      .then((mailMap) => res.json(mailMap))
      .catch((err) => res.send(err));
  })

  .delete((req, res) => {
    validate(schemas.STRING, req.params.id);

    MailMap.remove({ _id: req.params.email })
      .then(() => res.json({ message: 'Successfully deleted mail map' }))
      .catch((err) => res.send(err));
  });

router.route('/inbound_mail')
  .post((req, res) => {
    const events = Utils.parseArray(req.body.mandrill_events);
    validate(res, schemas.INBOUND_EVENTS, events);
    res.end();

    events.forEach((event) => {
      if (event.event !== 'inbound') return;
      Methods.findForwardingAddress(event.msg.email)
        .then((email) => {
          Mailer.send({
            "raw_message": event.msg.raw_msg,
            "from_email": "forwarding@farewill.com",
            "from_name": event.msg.from_name,
            "to": [email]
          });
        })
        .catch((err) => console.error(err));
    });
  });

module.exports = router;
