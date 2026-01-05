import React, { useState, useEffect } from "react";
import { Editor } from "amis-editor";
// @ts-ignore
import { render as renderAmis } from "amis";

import "amis/lib/themes/default.css";
import "amis/lib/helper.css";
import "amis/sdk/iconfont.css";
// import "amis-editor/dist/index.css";

function App(props) {
  const parentProps = props.parentProps;
  const [schema, setSchema] = useState(
    parentProps?.initialSchema || {
      type: "page",
      title: "Hello Amis",
      body: "This is a qiankun sub app (React 16 + TS)",
    }
  );

  return React.createElement(
    "div",
    { className: "amis-app", style: { height: "100vh" } },
    React.createElement(Editor, {
      value: schema,
      onChange: (value) => {
        setSchema(value);
        if (parentProps?.onSchemaChange) {
          parentProps.onSchemaChange(value);
        }
      },
      preview: false,
    })
  );
}

export default App;
