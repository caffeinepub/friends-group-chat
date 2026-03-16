import List "mo:core/List";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Runtime "mo:core/Runtime";

actor {
  public type Message = {
    senderName : Text;
    text : Text;
    timestamp : Time.Time;
  };

  module Message {
    public func compare(message1 : Message, message2 : Message) : Order.Order {
      Int.compare(message2.timestamp, message1.timestamp);
    };
  };

  let messages = List.empty<Message>();

  public shared ({ caller }) func postMessage(senderName : Text, text : Text) : async () {
    let message : Message = {
      senderName;
      text;
      timestamp = Time.now();
    };

    messages.add(message);

    if (messages.size() > 100) {
      let messagesArray = messages.toArray();
      let messagesWithoutLast = messagesArray.sliceToArray(0, messagesArray.size() - 1);
      messages.clear();
      messages.addAll(messagesWithoutLast.values());
    };
  };

  public query func getMessages() : async [Message] {
    messages.toArray().sort();
  };

  public query ({ caller }) func getMessageByIndex(index : Nat) : async Message {
    if (index >= messages.size()) {
      Runtime.trap(
        "Index " # index.toText() # " is out of bounds. Must be within 0 and " # messages.size().toText()
      );
    };
    messages.at(index);
  };
};
