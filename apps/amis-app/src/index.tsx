import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./public-path";

function render(props) {
  const { container } = props;
  const root = container
    ? container.querySelector("#root")
    : document.querySelector("#root");
  ReactDOM.render(React.createElement(App, { parentProps: props }), root);
}

if (!window["__POWERED_BY_QIANKUN__"]) {
  render({});
}

export async function bootstrap() {
  console.log("[react16] react app bootstraped");
}

export async function mount(props) {
  console.log("[react16] props from main framework", props);
  render(props);
}

export async function update(props) {
  console.log("[react16] update props", props);
  render(props);
}

export async function unmount(props) {
  const { container } = props;
  const root = container
    ? container.querySelector("#root")
    : document.querySelector("#root");
  if (root) {
    ReactDOM.unmountComponentAtNode(root);
  }
}
