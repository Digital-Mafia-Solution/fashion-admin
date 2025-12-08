import { cn } from "../../lib/utils";
import { forwardRef } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface SmartPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const SmartPhoneInput = forwardRef<HTMLInputElement, SmartPhoneInputProps>(
  ({ className, value, onChange, placeholder, ...props }, ref) => {
    return (
      <div className={cn("flex items-center border rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background", className)}>
        <PhoneInput
          international
          withCountryCallingCode
          defaultCountry="ZA"
          // FIX: Lock the country code so it can only be changed via flag
          countryCallingCodeEditable={false}
          value={value}
          onChange={(val) => onChange(val || "")}
          // FIX: Pass ref correctly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ref={ref as any}
          numberInputProps={{
            className: "border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-2 h-10 text-sm placeholder:text-muted-foreground flex-1 bg-transparent outline-none",
            placeholder: placeholder || "Enter phone number",
          }}
          containerComponentProps={{
            className: "flex items-center pl-3" 
          }}
          // FIX: Ensure visual separator (border-r) is present
          countrySelectProps={{
            className: "mr-2 pr-2 border-r border-border h-6 bg-transparent outline-none cursor-pointer opacity-70 hover:opacity-100 transition-opacity flex items-center"
          }}
          {...props}
        />
      </div>
    );
  }
);

SmartPhoneInput.displayName = "SmartPhoneInput";

export { SmartPhoneInput };