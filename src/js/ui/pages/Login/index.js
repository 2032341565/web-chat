import React, {Component} from 'react';
import {observer, inject} from 'mobx-react';

import classes from './style.css';
import Config from '../../../config';
import jrQRCode from 'jr-qrcode'
import wfc from '../../../wfc/client/wfc'
import PCSession from '../../../wfc/model/pcsession';
import { observable } from 'mobx';
import axios from 'axios';
import {connect} from '../../../platform'

@inject(stores => ({
    avatar: stores.sessions.avatar,
    code: stores.sessions.code,
}))
@observer
export default class Login extends Component {
    @observable qrCode;
    @observable desc = '扫码登录野火IM'
    appToken = '';
    loginTimer;
    qrCodeTimer;
    lastAppToken;


    componentDidMount() {
        axios.defaults.baseURL = Config.APP_SERVER;

        this.getCode();
        // this.keepLogin();
        this.refreshQrCode();
    }

    componentWillUnmount() {
        console.log('login will disappear');
        clearInterval(this.loginTimer);
        clearInterval(this.qrCodeTimer);
    }

    renderUser() {
        return (
            <div className={classes.inner}>
                {
                    <img
                        className="disabledDrag"
                        src={this.props.avatar}/>
                }

                <p>Scan successful</p>
                <p>Confirm login on mobile WildfireChat</p>
            </div>
        );
    }

    async getCode() {
        var response = await axios.post('/pc_session', {
            token: this.appToken,
            device_name: 'web',
            clientId: wfc.getClientId(),
            platform: Config.getWFCPlatform()
        } );
        console.log('----------- getCode', response.data);
        if (response.data) {
            let session = Object.assign(new PCSession(), response.data.result);
            this.appToken = session.token;
            this.qrCode = jrQRCode.getQrBase64(Config.QR_CODE_PREFIX_PC_SESSION + session.token);
            this.desc = '扫码登录野火IM'
            this.login();
        }
    }

    // async keepLogin() {
    //     this.loginTimer = setInterval(() => {
    //         this.login();
    //     }, 1 * 1000);
    // }

    async refreshQrCode() {
        this.qrCodeTimer = setInterval(() => {
            this.appToken = '';
            this.getCode();
        }, 30 * 1000);
    }

    async login() {
        if (this.appToken === '' || this.lastAppToken === this.appToken) {
            console.log('-------- token is empty or invalid');
            return;
        }
        var response = await axios.post('/session_login/' + this.appToken);
        console.log('---------- login', response.data);
        if (response.data) {
            switch (response.data.code) {
                case 0:
                    this.lastAppToken = this.appToken;
                    let userId = response.data.result.userId;
                    let imToken = response.data.result.token;
                    connect(userId, imToken);
                    WildFireIM.config.loginUser = wfc.getUserInfo(wfc.getUserId());
                    WildFireIM.config.token = this.appToken;
                    break;
                case 9:
                    console.log('qrcode scaned', response.data);
                    this.desc = response.data.result.userName + ' 已扫码，等待确认';
                    this.qrCode = response.data.result.portrait;
                    // update login status ui
                    this.login();
                    break;
                default:
                    this.lastAppToken = '';
                    console.log(response.data);
                    break
            }
        }
    }

    renderCode() {

        return (
            <div className={classes.inner}>
                {
                    this.qrCode && (<img className="disabledDrag" src={this.qrCode}/>)
                }

                <a href={window.location.pathname + '?' + +new Date()}>刷新二维码</a>

                <p>{this.desc}</p>
            </div>
        );
    }

    render() {
        return (
            <div className={classes.container}>
                {
                    // this.props.avatar ? this.renderUser() : this.renderCode()
                    this.renderCode()
                }
            </div>
        );
    }
}
