/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

module.exports = function(RED) {
    "use strict";

    const formats = require('./formatvalues.js');

    /******************************************************************************************************************
     *
     *
     */
    function ThermostatNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.topicOut   = config.topic;
        this.passthru   = config.passthru;
        this.topicDelim = '/';

        if (!this.clientConn) {
            this.error(RED._("thermostat.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("thermostat.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing SmartHome"});
            return;
        }

        let node = this;

        RED.log.debug("ThermostatNode(): node.topicOut = " + node.topicOut);

        /******************************************************************************************************************
         * called when state is updated from Google Assistant
         *
         */
        this.updated = function(states) {   // this must be defined before the call to clientConn.register()
            RED.log.debug("ThermostatNode(updated): states = " + JSON.stringify(states));

            node.status({fill:"green", shape:"dot", text:states.thermostatTemperatureSetpoint + " °C"});

            let msg = {
                topic: node.topicOut,
                payload: states
            };

            node.send(msg);
        };

        this.states = this.clientConn.register(this, 'thermostat', config.name);

        this.status({fill:"yellow", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("ThermostatNode(input)");

            let topicArr = msg.topic.split(node.topicDelim);
            let topic    = topicArr[topicArr.length - 1];   // get last part of topic

            RED.log.debug("ThermostatNode(input): topic = " + topic);

            try {
                if (topic.toUpperCase() === 'SET') {
                    /*RED.log.debug("ThermostatNode(input): SET");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("ThermostatNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let on     = node.states.on;
                    let online = node.states.online;

                    // on
                    if (object.hasOwnProperty('on')) {
                        on = formats.FormatValue(formats.Formats.BOOL, 'on', object.on);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (node.states.on !== on || node.states.online !== online){
                        node.states.on     = on;
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states;
                            node.send(msg);
                        }
                    }*/
                } else if (topic.toUpperCase() === 'THERMOSTATTEMPERATUREAMBIENT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureAmbient");
                    let thermostatTemperatureAmbient = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureAmbient', msg.payload);

                    if (node.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient) {
                        node.states.thermostatTemperatureAmbient = thermostatTemperatureAmbient;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.thermostatTemperatureAmbient;
                            node.send(msg);
                        }
                    }
                } else if (topic.toUpperCase() === 'THERMOSTATTEMPERATURESETPOINT') {
                    RED.log.debug("ThermostatNode(input): thermostatTemperatureSetpoint");
                    let thermostatTemperatureSetpoint = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureSetpoint', msg.payload);

                    if (node.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint) {
                        node.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.thermostatTemperatureSetpoint;
                            node.send(msg);
                        }
                    }

                } else if (topic.toUpperCase() === 'ONLINE') {
                    RED.log.debug("ThermostatNode(input): ONLINE");
                    let online = formats.FormatValue(formats.Formats.BOOL, 'online', msg.payload);

                    if (node.states.online !== online) {
                        node.states.online = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states.online;
                            node.send(msg);
                        }
                    }
                } else {
                    RED.log.debug("ThermostatNode(input): some other topic");
                    let object = {};

                    if (typeof msg.payload === 'object') {
                        object = msg.payload;
                    } else {
                        RED.log.debug("ThermostatNode(input): typeof payload = " + typeof msg.payload);
                        return;
                    }

                    let thermostatTemperatureAmbient  = node.states.thermostatTemperatureAmbient;
                    let thermostatTemperatureSetpoint = node.states.thermostatTemperatureSetpoint;
                    let online                        = node.states.online;

                    // thermostatTemperatureAmbient
                    if (object.hasOwnProperty('thermostatTemperatureAmbient')) {
                        thermostatTemperatureAmbient = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureAmbient', object.ambient);
                    }

                    // thermostatTemperatureSetpoint
                    if (object.hasOwnProperty('thermostatTemperatureSetpoint')) {
                        thermostatTemperatureSetpoint = formats.FormatValue(formats.Formats.FLOAT, 'thermostatTemperatureSetpoint', object.setpoint);
                    }

                    // online
                    if (object.hasOwnProperty('online')) {
                        online = formats.FormatValue(formats.Formats.BOOL, 'online', object.online);
                    }

                    if (node.states.thermostatTemperatureAmbient !== thermostatTemperatureAmbient || node.states.thermostatTemperatureSetpoint !== thermostatTemperatureSetpoint || node.states.online !== online){
                        node.states.thermostatTemperatureAmbient  = thermostatTemperatureAmbient;
                        node.states.thermostatTemperatureSetpoint = thermostatTemperatureSetpoint;
                        node.states.online                        = online;

                        node.clientConn.setState(node, node.states);  // tell Google ...

                        if (node.passthru) {
                            msg.payload = node.states;
                            node.send(msg);
                        }
                    }
                }
            } catch (err) {
                RED.log.error(err);
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'thermostat');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'thermostat');
            }

            done();
        });
    }

    RED.nodes.registerType("google-thermostat", ThermostatNode);
}
