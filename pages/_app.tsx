import * as React from "react";
import App from "next/app";
import '../global.css';
export default class extends App {
    render() {
        const { Component, pageProps } = this.props;
        return <div className="container">
            <Component {...pageProps} />
        </div>
    }
}