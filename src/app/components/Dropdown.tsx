import React from "react";

type DropDownProps = {
  options: string[];
  onSelect: (option: string) => void;
};

const DropDown: React.FC<DropDownProps> = ({
  options,
  onSelect,
}: DropDownProps): React.ReactElement => {
  return (
    <div
      role="listbox"
      className={`absolute left-0 top-full z-10 mt-2 w-full min-w-max bg-white rounded-lg shadow-lg overflow-hidden`}
    >
      {options.map((option: string): React.ReactElement => {
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={false}
            // Keep focus on the trigger so the menu is not dismissed by the
            // blur handler before this click is delivered.
            onMouseDown={(event): void => event.preventDefault()}
            onClick={(): void => onSelect(option)}
            className="block w-full text-left cursor-pointer p-2 text-black hover:bg-gradient-to-r from-black to-blue-600 hover:text-white transition duration-300"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

export default DropDown;
