import { useState } from "react";
import tw from "tailwind-styled-components";
import Logo from "@/src/assets/logo.svg";

const FlaskImage = tw.img`
absolute
w-full
h-full
aspect-square
object-contain
flex-auto
drop-shadow-flask
animate-potionAppear
`;

const FlaskContainer = tw.div`
overflow-hidden
w-full
max-h-full
min-h-[80%]
grow
relative
`;

type DropZoneProps = { isDrag?: boolean };

const DropZone = tw.div<DropZoneProps>`
  absolute
  top-0
  left-0
  right-0
  bottom-0
  m-2
  border-x-4
  border-y-4
  rounded-xl
  transition-all
  border-dashed
  duration-500
  border-black
  bg-[#21212166]
  ${({ isDrag }) => (isDrag ? `opacity-1` : `opacity-0`)}
`;

const FileInput = tw.input`
  relative
  h-full
  w-full
  opacity-0
`;

type FlaskProps = {
  uploadHandler: (a: File[]) => void;
  accept: string | string[];
};

function Flask({ uploadHandler, accept }: FlaskProps) {
  const [isDragActive, setDragActive] = useState<boolean>(false);

  const handleDragEnter = () => {
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (fileEvent: React.DragEvent<HTMLInputElement>) => {
    fileEvent.preventDefault();
    setDragActive(false);
    const files = Array.from(fileEvent.dataTransfer.files);
    uploadHandler(files);
  };

  const handleChange = (fileEvent: React.ChangeEvent<HTMLInputElement>) => {
    fileEvent.preventDefault();
    setDragActive(false);
    // Our input element is of type `file`, so we can be sure it's not null
    const fileList = fileEvent.target.files as FileList;
    const files = Array.from(fileList);

    uploadHandler(files);
    fileEvent.target.value = "";
  };

  if (Array.isArray(accept)) {
    accept = accept.reduce((a, b) => `${a},${b}`);
  }

  return (
    <FlaskContainer>
      <FlaskImage src={Logo} />
      <DropZone isDrag={isDragActive}>
        <FileInput
          type="file"
          title=""
          accept={accept}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onChange={handleChange}
          multiple
        />
      </DropZone>
    </FlaskContainer>
  );
}

export default Flask;
