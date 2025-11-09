import DropZone from "@/components/DropZone";

import bottle from "@/assets/bottle.svg";
import "@/styles/flask.css";

export const Flask = () => {
  return (
    <div className="flask-container-wrapper">
      <div className="flask-container">
        <img src={bottle} className="flask-image" />
      </div>
      <DropZone />
    </div>
  );
};
