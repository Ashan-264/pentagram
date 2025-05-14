import React, { useEffect, useState } from "react";

type DropDownProps = {
  cities: string[];
  showDropDown: boolean;
  toggleDropDown: (show: boolean) => void;
  citySelection: (city: string) => void;
};

const DropDown: React.FC<DropDownProps> = ({
  cities,
  citySelection,
}: DropDownProps): React.ReactElement => {
  const [showDropDown, setShowDropDown] = useState<boolean>(false);

  /**
   * Handle passing the city name
   * back to the parent component
   *
   * @param city  The selected city
   */
  const onClickHandler = (city: string): void => {
    citySelection(city);
  };

  useEffect(() => {
    setShowDropDown(showDropDown);
  }, [showDropDown]);

  return (
    <>
      <div
        className={`absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg`}
      >
        {cities.map((city: string, index: number): React.ReactElement => {
          return (
            <p
              key={index}
              onClick={(): void => {
                onClickHandler(city);
              }}
              className="cursor-pointer p-2 text-black hover:bg-gradient-to-r from-black to-blue-600 hover:text-white transition duration-300"
            >
              {city}
            </p>
          );
        })}
      </div>
    </>
  );
};

export default DropDown;
